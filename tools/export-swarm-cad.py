"""Package the CAD import's existing STL assembly as self-contained GLB files.

Usage: python3 tools/export-swarm-cad.py /path/to/gui/cad_assets spherical-swarm
The original model.json defines part names; STL coordinates are already placed
in assembly space in millimeters. Low-detail export uses vertex clustering.
"""
import json
import math
from pathlib import Path
import struct
import sys

source, output = map(Path, sys.argv[1:3])
metadata = json.loads((source / 'model.json').read_text())
output.mkdir(parents=True, exist_ok=True)


def read_stl(path):
    data = path.read_bytes()
    count = struct.unpack_from('<I', data, 80)[0]
    assert len(data) == 84 + 50 * count, path
    return [[struct.unpack_from('<3f', data, 84 + 50 * i + 12 + j * 12)
             for j in range(3)] for i in range(count)]


def convert(triangles, cell):
    sums, counts = {}, {}
    def key(point):
        return tuple(round(x / cell) for x in point) if cell else point
    for tri in triangles:
        for point in tri:
            k = key(point)
            sums.setdefault(k, [0., 0., 0.])
            counts[k] = counts.get(k, 0) + 1
            for i in range(3):
                sums[k][i] += point[i]
    points = [tuple(v / counts[k] for v in sums[k]) for k in sums]
    lookup = {k: i for i, k in enumerate(sums)}
    faces, seen = [], set()
    for tri in triangles:
        face = tuple(lookup[key(p)] for p in tri)
        signature = tuple(sorted(face))
        if len(set(face)) != 3 or signature in seen:
            continue
        seen.add(signature)
        faces.append(face)
    normals = [[0., 0., 0.] for _ in points]
    for a, b, c in faces:
        u = [points[b][i] - points[a][i] for i in range(3)]
        v = [points[c][i] - points[a][i] for i in range(3)]
        cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        for index in (a,b,c):
            for i in range(3):
                normals[index][i] += cross[i]
    # Source Z-up -> glTF Y-up, millimeters -> meters.
    positions = [(x / 1000, z / 1000, -y / 1000) for x,y,z in points]
    normalized = []
    for x,y,z in normals:
        n = math.sqrt(x*x+y*y+z*z) or 1
        normalized.append((x/n,z/n,-y/n))
    return positions, normalized, faces


def export(filename, cell):
    doc = {'asset': {'version': '2.0', 'generator': 'CAD STL assembly exporter',
                    'extras': {'revision': metadata.get('assembly_revision'), 'source_sha256': metadata['source_sha256'], 'vertex_clustering_mm': cell}},
           'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [],
           'materials': [], 'buffers': [], 'bufferViews': [], 'accessors': []}
    data = bytearray()
    total = 0
    def accessor(values, component, kind, target, bounds=False):
        while len(data) % 4:
            data.append(0)
        start = len(data)
        flattened = [x for row in values for x in row] if kind == 'VEC3' else values
        code = 'f' if component == 5126 else 'I'
        data.extend(struct.pack('<' + code * len(flattened), *flattened))
        view = len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': start, 'byteLength': len(data) - start, 'target': target})
        a = {'bufferView': view, 'componentType': component, 'count': len(values), 'type': kind}
        if bounds:
            a['min'] = [min(p[i] for p in values) for i in range(3)]
            a['max'] = [max(p[i] for p in values) for i in range(3)]
        doc['accessors'].append(a)
        return len(doc['accessors']) - 1
    for part in metadata['fixed'] + metadata['wheels']:
        if not part.get('mesh'):
            continue
        positions,normals,faces = convert(read_stl(source / part['mesh']), cell)
        total += len(faces)
        position = accessor(positions,5126,'VEC3',34962,True)
        normal = accessor(normals,5126,'VEC3',34962)
        indices = accessor([i for face in faces for i in face],5125,'SCALAR',34963)
        key = part['mass_key']
        color = {'shell_g':[.64,.77,.80,1], 'frame_g':[.77,.79,.73,1], 'cage_g':[.68,.70,.65,1],
                 'battery_g':[.16,.19,.22,1], 'motor_g':[.38,.43,.46,1], 'flywheel_g':[.73,.77,.79,1],
                 'esp32_g':[.11,.40,.31,1], 'buck_g':[.14,.42,.34,1], 'esc_g':[.18,.27,.29,1]}.get(key,[.5,.5,.5,1])
        idx = len(doc['materials'])
        doc['materials'].append({'name':part['name'], 'doubleSided':True,
                                 'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':.45 if key in ('motor_g','flywheel_g') else .05,'roughnessFactor':.55}})
        doc['meshes'].append({'name':part['name'],'primitives':[{'attributes':{'POSITION':position,'NORMAL':normal},'indices':indices,'material':idx}]})
        node = len(doc['nodes'])
        doc['nodes'].append({'name':part['name'],'mesh':node})
        doc['scenes'][0]['nodes'].append(node)
    doc['buffers']=[{'byteLength':len(data)}]
    text=json.dumps(doc,separators=(',',':')).encode()
    text += b' ' * (-len(text)%4)
    data += b'\x00' * (-len(data)%4)
    glb=struct.pack('<III',0x46546c67,2,12+8+len(text)+8+len(data))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(data),0x004e4942)+data
    (output/filename).write_bytes(glb)
    print(f'{filename}: {len(doc["nodes"])} parts, {total:,} triangles, {len(glb):,} bytes')

export('sphere-cad.glb',0)
export('sphere-cad-lite.glb',.8)
