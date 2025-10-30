const fs = require('fs');

// caminho do arquivo grande
const INPUT = './public/geojson/snv-brasil-completo.geojson';
// arquivo de saída só MG
const OUTPUT = './public/geojson/snv-mg.geojson';

// Ajuste aqui o nome correto do campo de UF nas features:
const CAMPO_UF = 'UF'; // se no seu geojson o campo chama "uf", "estado", etc, troque aqui

console.log('Lendo arquivo grande...');
const bruto = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

if (!bruto.features || !Array.isArray(bruto.features)) {
  console.error('GeoJSON inválido ou sem features.');
  process.exit(1);
}

console.log(`Total de features no Brasil inteiro: ${bruto.features.length}`);

const apenasMG = bruto.features.filter(f => {
  const props = f.properties || {};
  return props[CAMPO_UF] === 'MG' || props[CAMPO_UF] === 'Minas Gerais';
});

console.log(`Features só de MG: ${apenasMG.length}`);

const saida = {
  type: 'FeatureCollection',
  features: apenasMG,
};

fs.writeFileSync(OUTPUT, JSON.stringify(saida));
console.log(`Arquivo gerado em ${OUTPUT}`);
