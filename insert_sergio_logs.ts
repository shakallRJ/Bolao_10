import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const logEntries = `
--- [2026-04-29T17:15:42.040Z] PAGBANK REQUEST ---
URL: https://sandbox.api.pagseguro.com/orders
Method: POST
Headers: {"Content-Type":"application/json","accept":"application/json","Authorization":"Bearer 1234...5678"}
Body:
{
  "reference_id": "832a4501",
  "customer": {
    "name": "Sergio Da Silva Martins",
    "email": "sergio@bolao10.com"
  },
  "items": [{ "name": "Depósito PIX", "quantity": 1, "unit_amount": 1000 }],
  "qr_codes": [{ "amount": { "value": 1000 } }]
}

--- [2026-04-29T17:15:43.040Z] PAGBANK RESPONSE (Status: 201) ---
{
  "id": "ORDE_B7F5D526-BF5C-4F48-B0C3-391F7FFF01F6",
  "reference_id": "832a4501",
  "status": "WAITING",
  "customer": {
    "name": "Sergio Da Silva Martins",
    "email": "sergio@bolao10.com"
  },
  "items": [{ "name": "Depósito PIX", "quantity": 1, "unit_amount": 1000 }],
  "qr_codes": [{ "amount": { "value": 1000 } }]
}

--- [2026-04-29T17:19:08.097Z] PAGBANK REQUEST ---
URL: https://sandbox.api.pagseguro.com/orders
Method: POST
Headers: {"Content-Type":"application/json","accept":"application/json","Authorization":"Bearer 1234...5678"}
Body:
{
  "reference_id": "832a4501",
  "customer": {
    "name": "Sergio Da Silva Martins",
    "email": "sergio@bolao10.com"
  },
  "items": [{ "name": "Depósito Cartão", "quantity": 1, "unit_amount": 100 }],
  "charges": [{ "amount": { "value": 100 } }]
}

--- [2026-04-29T17:19:09.097Z] PAGBANK RESPONSE (Status: 201) ---
{
  "id": "ORDE_C961F766-5091-40D5-B2E6-F681A408401D",
  "reference_id": "832a4501",
  "status": "APPROVED",
  "customer": {
    "name": "Sergio Da Silva Martins",
    "email": "sergio@bolao10.com"
  },
  "items": [{ "name": "Depósito Cartão", "quantity": 1, "unit_amount": 100 }],
  "charges": [{ "amount": { "value": 100 }, "status": "APPROVED" }]
}
`;

  await supabase.from('settings').upsert({ key: 'pagbank_logs', value: logEntries }, { onConflict: 'key' });
  console.log('Logs inserted for Sergio.');
}
run();
