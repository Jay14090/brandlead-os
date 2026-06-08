import { auditPersonContacts } from './personExtractor';
import { rankBestOutreachContact } from '../scoring/bestOutreachContact';

async function runTests() {
  console.log('--- Running Acceptance Tests ---');

  // Test 1: Direct person email and phone
  const audit1 = await auditPersonContacts('Dhaval S Shah', 'Rajvi Stock Broking', [
    { type: 'phone', value: '079-40803038', context: 'CEO Dhaval S Shah 079-40803038 rajvistock@gmail.com' },
    { type: 'email', value: 'rajvistock@gmail.com', context: 'CEO Dhaval S Shah 079-40803038 rajvistock@gmail.com' }
  ]);
  console.log('Test 1 Output:', JSON.stringify(audit1, null, 2));

  // Test 2: General company contact next to customer care
  const audit2 = await auditPersonContacts('Dhaval S Shah', 'Rajvi Stock Broking', [
    { type: 'email', value: 'customercare@company.com', context: 'Customer care customercare@company.com 079-40803006' },
    { type: 'phone', value: '079-40803006', context: 'Customer care customercare@company.com 079-40803006' }
  ]);
  console.log('Test 2 Output:', JSON.stringify(audit2, null, 2));

  // Test 3: Compliance officer
  const audit3 = await auditPersonContacts('Rutvi Shah', 'Rajvi Stock Broking', [
    { type: 'email', value: 'compliance@example.com', context: 'Compliance Officer Rutvi Shah compliance@example.com' }
  ]);
  console.log('Test 3 Output:', JSON.stringify(audit3, null, 2));

  // Test 4: Founder with no contact
  const audit4 = await auditPersonContacts('Mr. A', 'XYZ Finance', []);
  console.log('Test 4 Output:', JSON.stringify(audit4, null, 2));

  // Test 5: Info email
  const audit5 = await auditPersonContacts('Mr. A', 'XYZ Finance', [
    { type: 'email', value: 'info@xyzfinance.com', context: 'Contact us at info@xyzfinance.com' }
  ]);
  console.log('Test 5 Output:', JSON.stringify(audit5, null, 2));
  
  // Test Ranking Best Outreach
  const ranking = rankBestOutreachContact(
    [
      {
        id: '1', personName: 'Rutvi Shah', role: 'Compliance Officer', roleCategory: 'Compliance', confidence: 90, verificationStatus: 'Verified', sourceUrl: 'http', sourceSnippet: '',
        contacts: [{ id: 'c1', leadId: 'l1', type: 'email', value: 'compliance@example.com', normalizedValue: 'compliance@example.com', label: null, personName: 'Rutvi Shah', role: 'Compliance Officer', department: null, contactPurpose: 'compliance', sourceUrl: 'http', sourcePageTitle: null, sourceSnippet: null, confidence: 90, isOutreachRelevant: false, notes: null, createdAt: new Date() }]
      },
      {
        id: '2', personName: 'Dhaval S Shah', role: 'CEO', roleCategory: 'CEO', confidence: 95, verificationStatus: 'Verified', sourceUrl: 'http', sourceSnippet: '',
        contacts: [{ id: 'c2', leadId: 'l1', type: 'email', value: 'dhaval@example.com', normalizedValue: 'dhaval@example.com', label: null, personName: 'Dhaval', role: 'CEO', department: null, contactPurpose: 'primary', sourceUrl: 'http', sourcePageTitle: null, sourceSnippet: null, confidence: 90, isOutreachRelevant: true, notes: null, createdAt: new Date() }]
      }
    ],
    []
  );

  console.log('Best Outreach Result:', JSON.stringify({ bestName: ranking.bestPerson?.personName, bestEmail: ranking.bestContact?.value }, null, 2));
}

runTests().catch(console.error);
