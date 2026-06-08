const https = require('https');
const PROJECT = 'gunes-english';

function httpsGet(collection) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?pageSize=50`,
      method: 'GET',
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ raw: data.slice(0, 200) }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function parseVal(v) {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return v.integerValue;
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(parseVal);
  return '?';
}

function parseDoc(doc) {
  const id = doc.name.split('/').pop();
  const fields = {};
  Object.entries(doc.fields || {}).forEach(([k, v]) => { fields[k] = parseVal(v); });
  return { id, ...fields };
}

async function show(name) {
  const result = await httpsGet(name);
  const docs = (result.documents || []).map(parseDoc);
  return docs;
}

async function main() {
  console.log('\n=== ORDER (all) ===');
  const orders = await show('Order');
  orders.forEach(o => console.log(`  [${o.id}] email:${o.student_email} | student_id:${o.student_id} | pkg:${o.package_id} | status:${o.status}`));
  console.log('  Total:', orders.length);

  console.log('\n=== PACKAGE (all) ===');
  const pkgs = await show('Package');
  pkgs.forEach(p => console.log(`  [${p.id}] name:${p.name} | status:${p.status} | price:${p.price}`));
  console.log('  Total:', pkgs.length);

  console.log('\n=== STUDENT (name + email + id) ===');
  const students = await show('Student');
  students.forEach(s => console.log(`  [${s.id}] name:${s.full_name} | email:${s.email}`));
  console.log('  Total:', students.length);

  console.log('\n=== INVOICE (paid ones) ===');
  const invs = await show('Invoice');
  invs.filter(i => i.student_email).forEach(i => console.log(`  [${i.id}] email:${i.student_email} | pkg:${i.package_id} | amount:${i.total_amount || i.amount} | status:${i.status}`));
  console.log('  Total:', invs.length);
}

main().catch(console.error);
