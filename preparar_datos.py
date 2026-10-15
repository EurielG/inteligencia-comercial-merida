"""Genera los archivos de datos (carpeta data/) que usa la página web.

Uso:  python preparar_datos.py <carpeta con datos_caracterizacion_merida.zip descomprimido>
Lee el DENUE 2024 y 2026, el NSE por AGEB (AMAI) y los contornos de AGEB, y los resultados
del análisis de sentimientos. Repite las reglas de la Etapa 1 (industrias), de la Etapa 3
(HHI y zonas a 1.5 km) y resume la Etapa 4 (reseñas).
"""
import json, os, re, sys, unicodedata
from collections import Counter
import numpy as np
import pandas as pd

DATOS = sys.argv[1]
AQUI = os.path.dirname(os.path.abspath(__file__))
PROY = os.path.dirname(AQUI)
OUT = os.path.join(AQUI, 'data')
os.makedirs(OUT, exist_ok=True)

FOCO = ['Fitness y deporte', 'Servicios para mascotas', 'Servicios profesionales']
CENTRO_LAT, CENTRO_LON = 20.9674, -89.6237


def norm(v):
    v = '' if pd.isna(v) else str(v)
    v = unicodedata.normalize('NFKD', v).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'\s+', ' ', v.lower()).strip()


def haversine(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 2 * 6371 * np.arcsin(np.sqrt(a))


def industria(codigo, actividad):
    c, a = str(int(codigo)), norm(actividad)
    if c.startswith(('71394', '61162')) or any(p in a for p in ['acondicionamiento fisico', 'gimnasio', 'club deportivo']):
        return 'Fitness y deporte'
    if c.startswith('81211'): return 'Cuidado personal y belleza'
    if c.startswith('54194') or any(p in a for p in ['servicios veterinarios', 'servicios para mascotas']):
        return 'Servicios para mascotas'
    if c.startswith('722'): return 'Restaurantes y alimentos'
    if c.startswith(('721', '487', '5615')): return 'Turismo y hospitalidad'
    if c.startswith('62'): return 'Salud y bienestar'
    if c.startswith('61'): return 'Educación'
    if c.startswith('71'): return 'Entretenimiento'
    if c.startswith('52'): return 'Servicios financieros'
    if c.startswith('54'): return 'Servicios profesionales'
    return None


def zona(dist, rumbo):
    if dist <= 2.5: return 'Centro'
    if rumbo >= 315 or rumbo < 45: return 'Norte'
    if rumbo < 135: return 'Este'
    if rumbo < 225: return 'Sur'
    return 'Oeste'


def leer_denue(nombre):
    d = pd.read_csv(os.path.join(DATOS, nombre), low_memory=False)
    d['codigo_act'] = pd.to_numeric(d['codigo_act'], errors='coerce')
    d = d.dropna(subset=['codigo_act', 'nombre_act']).copy()
    d['industria'] = [industria(c, a) for c, a in zip(d['codigo_act'], d['nombre_act'])]
    d['lat'] = pd.to_numeric(d['latitud'].astype(str).str.replace(',', '.'), errors='coerce')
    d['lon'] = pd.to_numeric(d['longitud'].astype(str).str.replace(',', '.'), errors='coerce')
    return d


d26 = leer_denue('denue_merida_2026.csv')
d24 = leer_denue('denue_merida_2024.csv')
print('DENUE 2026:', len(d26), '| 2024:', len(d24))

# ---------------- Etapa 1-2: ranking de las 10 industrias (60% popularidad, 40% dinamismo) ----------------
cl = d26.dropna(subset=['industria']).copy()
cl['reciente'] = pd.to_datetime(cl['fecha_alta'], errors='coerce') >= '2024-04-01'
r = cl.groupby('industria').agg(negocios=('id', 'size'), altas=('reciente', 'sum'))
r['tasa'] = r['altas'] / r['negocios']
r['dinamismo'] = r['tasa'] / (r['altas'].sum() / r['negocios'].sum())
mm = lambda s: (s - s.min()) / (s.max() - s.min())
r['score'] = 100 * (0.6 * mm(np.log1p(r['negocios'])) + 0.4 * mm(r['dinamismo']))
r = r.sort_values('score', ascending=False)
ranking = [{'industria': i, 'negocios': int(x.negocios), 'tasa_reciente': round(float(x.tasa), 3),
            'score': round(float(x.score), 1), 'foco': i in FOCO} for i, x in r.iterrows()]
print(r[['negocios', 'tasa', 'score']].round(3))

# ---------------- Negocios de las 3 industrias (puntos del mapa) ----------------
foco = d26[d26['industria'].isin(FOCO)].dropna(subset=['lat', 'lon']).copy()
dist = haversine(foco['lat'], foco['lon'], CENTRO_LAT, CENTRO_LON)
p1, p2 = np.radians(CENTRO_LAT), np.radians(foco['lat'])
dl = np.radians(foco['lon'] - CENTRO_LON)
rumbo = (np.degrees(np.arctan2(np.sin(dl) * np.cos(p2), np.cos(p1) * np.sin(p2) - np.sin(p1) * np.cos(p2) * np.cos(dl))) + 360) % 360
foco['zona'] = [zona(a, b) for a, b in zip(dist, rumbo)]
SUBS = sorted(foco['nombre_act'].unique())
negocios = {'industrias': FOCO, 'subcategorias': SUBS,
            'campos': ['lat', 'lon', 'industria', 'subcategoria', 'nombre', 'personal', 'zona'],
            'filas': [[round(a, 5), round(b, 5), FOCO.index(i), SUBS.index(s), str(n).title()[:60], str(p).replace(' personas', ''), z]
                      for a, b, i, s, n, p, z in zip(foco['lat'], foco['lon'], foco['industria'], foco['nombre_act'],
                                                     foco['nom_estab'], foco['per_ocu'], foco['zona'])]}
print('Negocios foco con coordenadas:', len(foco))

# Negocios por zona e industria
por_zona = foco.groupby(['industria', 'zona']).size().unstack(fill_value=0)

# ---------------- Crecimiento 2024 -> 2026 por subcategoría ----------------
c24 = d24[d24['industria'].isin(FOCO)].groupby(['industria', 'nombre_act']).size()
c26 = d26[d26['industria'].isin(FOCO)].groupby(['industria', 'nombre_act']).size()
crec = pd.concat([c24.rename('n2024'), c26.rename('n2026')], axis=1).fillna(0).astype(int).reset_index()
crec = crec[(crec.n2024 + crec.n2026) >= 10]
crecimiento = {'industrias': {i: {'n2024': int((d24['industria'] == i).sum()), 'n2026': int((d26['industria'] == i).sum())} for i in FOCO},
               'total': {'n2024': len(d24), 'n2026': len(d26)},
               'subcategorias': crec.rename(columns={'nombre_act': 'subcategoria'}).to_dict('records')}

# ---------------- Etapa 3: HHI por industria y subcategoría ----------------
SUF = r'\b(s a b de c v|s a de c v|sa de cv|sapi de cv|s de rl de cv|s de r l de c v|s de rl|s c|sc|a c|ac|s a|sa|de cv|cv|sapi)\b'
GEN = set('''de del la las el los y e en para sin nombre s a c v sc ac despacho despachos juridico juridicos juridica bufete bufetes abogado
abogados asesoria asesorias legal legales notaria publica contable contables contabilidad fiscal fiscales auditoria consultoria consultor
consultores administracion servicios servicio arquitectura arquitecto arquitectos ingenieria diseno grafico publicidad fotografia estudio
consultorio clinica veterinaria veterinario veterinarios veterinarias hospital estetica canina mascotas mascota gimnasio gimnasios gym mixto
fitness clases clase zumba escuela academia taekwondo tae kwon do karate box boxeo crossfit yoga pilates centro centros club deportivo
deportiva unidad acondicionamiento fisico sector privado'''.split())


def limpio(t):
    t = re.sub(r'[^a-z0-9 ]', ' ', norm(t)); t = re.sub(SUF, ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def generico(n):
    w = n.split(); return len(w) == 0 or all(p in GEN or p.isdigit() for p in w)


def empresa(row):
    rs = limpio(row['raz_social'])
    if rs and not generico(rs): return 'RS: ' + rs
    nm = limpio(row['nom_estab'])
    if nm and not generico(nm): return 'NOM: ' + nm
    return 'ID: ' + str(row['id'])


def personal(r):
    n = [int(x) for x in re.findall(r'\d+', norm(r))]
    if len(n) >= 2: return (n[0] + n[1]) / 2
    if len(n) == 1: return 300 if n[0] >= 251 else n[0]
    return np.nan


mc = d26[d26['industria'].isin(FOCO)].copy()
mc['pers'] = mc['per_ocu'].map(personal)
mc['empresa'] = mc.apply(empresa, axis=1)
mc = mc[~mc['nombre_act'].map(norm).str.contains('sector publico') & mc['pers'].notna()]


def hhi(df):
    t = df.groupby('empresa')['pers'].sum().sort_values(ascending=False); s = t / t.sum()
    te = df.groupby('empresa').size(); se = te / te.sum()
    return {'negocios': len(df), 'empresas': len(t), 'hhi': round(float(((s * 100) ** 2).sum())),
            'hhi_establecimientos': round(float(((se * 100) ** 2).sum())), 'cr4': round(float(s.head(4).sum()), 3),
            'lider': t.index[0].split(': ', 1)[1].upper()[:50], 'lider_part': round(float(s.iloc[0]), 3)}


conc = {'industrias': {i: hhi(g) for i, g in mc.groupby('industria')},
        'subcategorias': sorted([{'industria': i, 'subcategoria': s, **hhi(g)} for (i, s), g in mc.groupby(['industria', 'nombre_act']) if len(g) >= 10],
                                key=lambda x: x['hhi'])}
print({k: v['hhi'] for k, v in conc['industrias'].items()})

# ---------------- Etapa 3: zonas a 1.5 km por AGEB ----------------
geo = json.load(open(os.path.join(DATOS, 'ageb_merida_2020.geojson')))
nse = pd.read_csv(os.path.join(DATOS, 'nse_amai_merida.csv'), dtype=str)
nse['clave'] = nse['loc'].str.zfill(4) + '-' + nse['ageb'].str.zfill(4)
for c in ['AB', 'C+', 'C', 'C-', 'D+', 'D', 'E', 'viviendas']:
    nse[c] = pd.to_numeric(nse[c].str.replace(',', ''), errors='coerce').fillna(0)
nse['objetivo'] = nse['AB'] + nse['C+']
nse = nse.set_index('clave')

d26['clave'] = (pd.to_numeric(d26['cve_loc'], errors='coerce').astype('Int64').astype(str).str.zfill(4) + '-' +
                d26['ageb'].astype(str).str.replace(r'\.0$', '', regex=True).str.zfill(4))
colonia = d26.groupby('clave')['nomb_asent'].agg(lambda s: s.dropna().astype(str).str.title().mode().iat[0] if s.notna().any() else '')

agebs = []
for f in geo['features']:
    p = f['properties']; clave = p['CVE_LOC'] + '-' + p['CVE_AGEB']
    ring = np.array(f['geometry']['coordinates'][0] if f['geometry']['type'] == 'Polygon' else f['geometry']['coordinates'][0][0])
    agebs.append({'clave': clave, 'lon': ring[:, 0].mean(), 'lat': ring[:, 1].mean()})
A = pd.DataFrame(agebs).set_index('clave')
A = A.join(nse[['AB', 'C+', 'C', 'C-', 'D+', 'D', 'E', 'viviendas', 'objetivo', 'nivel_predominante']], how='left')
A[['objetivo', 'viviendas']] = A[['objetivo', 'viviendas']].fillna(0)
A['colonia'] = colonia.reindex(A.index).fillna('')

DM = haversine(A['lat'].values[:, None], A['lon'].values[:, None], A['lat'].values[None, :], A['lon'].values[None, :])
hog_total = A['objetivo'].sum()
zonas_res = {}
for ind in FOCO:
    pts = foco[foco['industria'] == ind]
    dn = haversine(A['lat'].values[:, None], A['lon'].values[:, None], pts['lat'].values[None, :], pts['lon'].values[None, :])
    ref = hog_total / len(pts)
    res = {}
    for rad in (1.0, 1.5, 2.0):
        hog = (DM <= rad).astype(float) @ A['objetivo'].values
        neg = (dn <= rad).sum(1)
        res[rad] = (hog, neg, (hog / (neg + 1)) / ref)
    hog, neg, idx = res[1.5]
    eleg = (hog >= 3000) & (A['viviendas'].values >= 100)
    robust = sum((res[r][2] >= 1.5) for r in (1.0, 1.5, 2.0)) >= 2
    sat = (neg >= np.percentile(neg, 75)) & (idx < 0.5)
    est = np.where(eleg & (idx >= 1.5) & robust, 'recomendada', np.where(sat, 'saturada', 'neutral'))
    zonas_res[ind] = {'hog': hog, 'neg': neg, 'idx': idx, 'estado': est, 'ref': ref}
    print(ind, 'ref', round(ref), 'recomendadas', (est == 'recomendada').sum(), 'saturadas', (est == 'saturada').sum())

# ---------------- Etapa 1: perfiles de territorio A-D (mismo método que el notebook de la Etapa 1) ----------------
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
GF = {46: 'Comercio minorista', 72: 'Alimentos y hospedaje', 81: 'Otros servicios', 62: 'Salud', 61: 'Educación',
      54: 'Servicios a empresas', 52: 'Servicios a empresas', 53: 'Servicios a empresas', 56: 'Servicios a empresas',
      55: 'Servicios a empresas', 51: 'Servicios a empresas', 31: 'Industria y construcción', 32: 'Industria y construcción',
      33: 'Industria y construcción', 23: 'Industria y construcción', 21: 'Industria y construcción', 22: 'Industria y construcción',
      43: 'Mayoreo y transporte', 48: 'Mayoreo y transporte', 49: 'Mayoreo y transporte'}
GR = ['Comercio minorista', 'Alimentos y hospedaje', 'Otros servicios', 'Salud', 'Educación', 'Servicios a empresas',
      'Industria y construcción', 'Mayoreo y transporte', 'Esparcimiento, gobierno y otros']
d26['grupo'] = (d26['codigo_act'] // 10000).astype(int).map(GF).fillna(GR[-1])
d26['mg'] = ~d26['per_ocu'].isin(['0 a 5 personas', '6 a 10 personas'])
d26['rec'] = pd.to_datetime(d26['fecha_alta'], errors='coerce') >= '2024-04-01'
d24['clave'] = (pd.to_numeric(d24['cve_loc'], errors='coerce').astype('Int64').astype(str).str.zfill(4) + '-' +
                d24['ageb'].astype(str).str.replace(r'\.0$', '', regex=True).str.zfill(4))
d24['baja'] = ~d24['id'].isin(d26['id'])
gg = d26.groupby('clave')
pa = pd.DataFrame({'negocios': gg.size(), 'lat': gg['lat'].median(), 'lon': gg['lon'].median(), 'pct_mg': gg['mg'].mean(), 'pct_rec': gg['rec'].mean()})
pa = pa.join(pd.crosstab(d26['clave'], d26['grupo'], normalize='index').reindex(columns=GR).fillna(0).add_prefix('pct_'))
pa['tasa_bajas'] = d24.groupby('clave')['baja'].mean()
pa['log_neg'] = np.log1p(pa['negocios'])
VAR = ['log_neg', 'pct_mg', 'pct_rec', 'tasa_bajas'] + ['pct_' + x for x in GR]
pb = pa[pa['negocios'] >= 30].dropna(subset=VAR + ['lat']).copy()
Zs = StandardScaler().fit_transform(pb[VAR])
Xp = PCA(n_components=0.8, svd_solver='full').fit(Zs).transform(Zs)
pb['c'] = KMeans(n_clusters=4, n_init=10, random_state=42).fit_predict(Xp)
pb['dist'] = haversine(pb['lat'], pb['lon'], CENTRO_LAT, CENTRO_LON)
orden_c = pb.groupby('c')['dist'].median().sort_values().index
pb['perfil'] = pb['c'].map({c: chr(65 + i) for i, c in enumerate(orden_c)})
PERFIL = pb['perfil']
print('Perfiles (AGEB):', PERFIL.value_counts().sort_index().to_dict())

# GeoJSON reducido para la página
abrev ={'Fitness y deporte': 'fit', 'Servicios para mascotas': 'mas', 'Servicios profesionales': 'pro'}
feats = []
for k, f in enumerate(geo['features']):
    p = f['properties']; clave = p['CVE_LOC'] + '-' + p['CVE_AGEB']; a = A.loc[clave]
    coords = json.loads(json.dumps(f['geometry']['coordinates']), parse_float=lambda x: round(float(x), 5))
    props = {'clave': clave, 'colonia': a['colonia'], 'nse': a['nivel_predominante'] if isinstance(a['nivel_predominante'], str) else 'Sin dato',
             'viviendas': int(a['viviendas']), 'objetivo': int(a['objetivo']), 'perfil': PERFIL.get(clave, '')}
    for ind in FOCO:
        z = zonas_res[ind]; t = abrev[ind]
        props[t + '_idx'] = round(float(z['idx'][k]), 2); props[t + '_neg'] = int(z['neg'][k])
        props[t + '_hog'] = int(z['hog'][k]); props[t + '_est'] = str(z['estado'][k])
    feats.append({'type': 'Feature', 'properties': props, 'geometry': {'type': f['geometry']['type'], 'coordinates': coords}})
json.dump({'type': 'FeatureCollection', 'features': feats}, open(os.path.join(OUT, 'agebs.geojson'), 'w'), ensure_ascii=False, separators=(',', ':'))

# ---------------- Etapa 4: reseñas ----------------
res = pd.read_excel(os.path.join(PROY, 'analisis_sentimientos', 'analisis_sentimientos_resultados.xlsx'), sheet_name=None)
rv = res['Reseñas']
ORD = ['Positivo', 'Neutral', 'Negativo']
asp_cols = [c for c in rv.columns if c.startswith('asp_')]
sent = {'industrias': {}, 'subcategorias': {}, 'aspectos': {}, 'palabras': {}, 'ejemplos': []}

# Correcciones a las nubes de palabras: el lematizador convierte algunos sustantivos en verbos
# ("doctora" -> "doctorar", "mesas" -> "mesar") y deja faltas de ortografía o nombres propios de mascotas y personas.
CORRIGE = {'doctorar': 'doctora', 'dra': 'doctora', 'mesar': 'mesa', 'techar': 'techado', 'atencion': 'atención',
           'atendio': 'atender', 'clinica': 'clínica', 'exelente': 'excelente', 'limpia': 'limpio', 'deja': 'dejar',
           'lebanese': 'libanés', 'gatita': 'gatito'}
NOMBRES = {'winny', 'manuel', 'duarte', 'lic', 'vas', 'etcétera'}


def palabras(textos, n=80):
    c = Counter()
    for w in ' '.join(textos.fillna('')).split():
        w = CORRIGE.get(w, w)
        if w not in NOMBRES:
            c[w] += 1
    return c.most_common(n)
for ind, g in rv.groupby('industria'):
    vc = g['sentimiento'].value_counts()
    sent['industrias'][ind] = {s: int(vc.get(s, 0)) for s in ORD}
    sent['aspectos'][ind] = [{'aspecto': c[4:], 'menciones': int(g[c].sum()), 'negativas': int((g[c] & (g['sentimiento'] == 'Negativo')).sum())} for c in asp_cols]
    sent['palabras'][ind] = {s: palabras(g.loc[g['sentimiento'] == s, 'texto_limpio']) for s in ORD}
for sub, g in rv.dropna(subset=['subcategoria']).groupby('subcategoria'):
    vc = g['sentimiento'].value_counts()
    sent['subcategorias'][sub] = {'industria': g['industria'].iat[0], **{s: int(vc.get(s, 0)) for s in ORD}}
# Ejemplos: reseñas cortas y claras de cada industria y sentimiento (para la tabla de la página)
for (ind, s), g in rv[(rv['n_palabras'].between(6, 60))].groupby(['industria', 'sentimiento']):
    # Se eligen reseñas claras (probabilidad alta) pero al azar y casi todas en español: el modelo en inglés da
    # probabilidades más altas, así que ordenar solo por score dejaba puras reseñas en inglés.
    claras = g[(g['score'] >= 0.6) if s == 'Positivo' else (g['score'] <= -0.6) if s == 'Negativo' else g['score'].abs() < 0.3]
    es = claras[claras['idioma'] == 'es'].sample(frac=1, random_state=7).head(36)
    en = claras[claras['idioma'] == 'en'].sample(frac=1, random_state=7).head(4)
    for _, x in pd.concat([es, en]).iterrows():
        sent['ejemplos'].append({'industria': ind, 'sentimiento': s, 'negocio': x['negocio'] if isinstance(x['negocio'], str) else '',
                                 'texto': str(x['texto'])[:400]})

# Evidencia por tema: reseñas en español que mencionan el tema, positivas y negativas
sent['evidencia'] = {}
for ind, g in rv[(rv['idioma'] == 'es') & rv['n_palabras'].between(8, 70)].groupby('industria'):
    sent['evidencia'][ind] = {}
    for c in asp_cols:
        h = g[g[c]]
        sent['evidencia'][ind][c[4:]] = {
            s: [str(t)[:320] for t in h[(h['sentimiento'] == s) & ((h['score'] >= 0.6) if s == 'Positivo' else (h['score'] <= -0.6))]
                .sample(frac=1, random_state=3).head(5)['texto']] for s in ['Positivo', 'Negativo']}

# ---------------- Archivo principal de resultados ----------------
resultados = {
    'ranking': ranking,
    'por_zona': {i: {z: int(por_zona.loc[i].get(z, 0)) for z in ['Norte', 'Este', 'Centro', 'Oeste', 'Sur']} for i in FOCO},
    'crecimiento': crecimiento,
    'concentracion': conc,
    'zonas_ref': {i: round(float(zonas_res[i]['ref'])) for i in FOCO},
    'sentimiento': sent,
}
json.dump(resultados, open(os.path.join(OUT, 'resultados.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(negocios, open(os.path.join(OUT, 'negocios.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
for f in os.listdir(OUT):
    print(f, round(os.path.getsize(os.path.join(OUT, f)) / 1024), 'KB')

# ---------------- User personas (fichas del diseño en personas_src/) ----------------
import html as _html
FICHAS = [('Main', 'Fitness y deporte', 'Gimnasio (acondicionamiento físico privado)'), ('Escuelas', 'Fitness y deporte', 'Escuela de deporte privada'),
          ('VetPrivada', 'Servicios para mascotas', 'Veterinaria privada'), ('VetPublica', 'Servicios para mascotas', 'Veterinaria pública'),
          ('Publicidad', 'Servicios profesionales', 'Agencia de publicidad'), ('Interiores', 'Servicios profesionales', 'Diseño de interiores')]
txt = lambda s: _html.unescape(re.sub(r'<[^>]+>', '', s)).strip()
personas = []
for archivo, ind, sub in FICHAS:
    h = open(os.path.join(AQUI, 'personas_src', archivo + '.dc.html'), encoding='utf-8').read()
    datos = re.findall(r'font-size: 22px; font-weight: 700;">([^<]+)</div><div[^>]*>([^<]+)</div>', h)
    secciones = []
    for titulo, cuerpo in re.findall(r'<h2[^>]*>([^<]+)</h2>\s*</div>\s*<ul[^>]*>(.*?)</ul>', h, re.S):
        secciones.append({'titulo': titulo, 'items': [txt(x) for x in re.findall(r'<li>(.*?)</li>', cuerpo, re.S)]})
    barras = [{'texto': txt(a), 'valor': int(b)} for a, b in re.findall(r'<span>(.*?)</span><b>(\d+)%</b>', h)]
    personas.append({'industria': ind, 'subcategoria': sub, 'nombre': txt(re.search(r'<h1[^>]*>(.*?)</h1>', h).group(1)),
                     'rol': txt(re.search(r'border-radius: 999px[^>]*>(.*?)</div>', h).group(1)),
                     'datos': [{'etiqueta': a, 'valor': txt(b)} for a, b in datos], 'secciones': secciones, 'barras': barras,
                     'fuente': txt(re.search(r'color: #4A5A4E;">(.*?)</div>', h, re.S).group(1))})
json.dump(personas, open(os.path.join(OUT, 'personas.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('Personas:', [p['nombre'] for p in personas])

# Copias en .js para que la página funcione también abriendo index.html con doble clic (sin servidor)
for nombre, var in [('resultados.json', 'RESULTADOS'), ('negocios.json', 'NEGOCIOS'), ('agebs.geojson', 'AGEBS'), ('personas.json', 'PERSONAS')]:
    with open(os.path.join(OUT, nombre)) as f, open(os.path.join(OUT, nombre.split('.')[0] + '.js'), 'w') as g:
        g.write(f'window.{var} = ' + f.read() + ';\n')
print('Archivos .js listos')
