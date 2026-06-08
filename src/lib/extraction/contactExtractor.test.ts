import { extractContactsFromPage } from './contactExtractor';
import { validateAndCleanContacts } from './contactValidator';

describe('Deterministic Contact Extraction', () => {

  const testExtract = (htmlOrText: string) => {
    const isHtml = htmlOrText.includes('<');
    const raw = extractContactsFromPage({
      url: 'https://example.com/contact',
      title: 'Contact Us',
      html: isHtml ? htmlOrText : undefined,
      text: !isHtml ? htmlOrText : undefined,
    });
    return validateAndCleanContacts(raw);
  };

  it('Test 1: Normal indian landline pair', () => {
    const input = "Customer care 079-40803006 / 079-40803007";
    const result = testExtract(input);
    const phones = result.filter(r => r.type === 'phone').map(r => r.value);
    
    expect(phones).toEqual(["079-40803006", "079-40803007"]);
  });

  it('Test 2: Timings should be ignored', () => {
    const input = "Timings: 9am to 6pm Saturdays 10am to 5pm";
    const result = testExtract(input);
    expect(result.length).toBe(0);
  });

  it('Test 3: CEO block parsing', () => {
    const input = "<body><div class='card'>CEO<br>Dhaval S Shah<br>079-40803038<br>rajvistock@gmail.com</div></body>";
    const result = testExtract(input);
    
    const phone = result.find(r => r.type === 'phone');
    expect(phone?.value).toBe('079-40803038');
    expect(phone?.role).toBe('CEO');
    expect(phone?.isOutreachRelevant).toBe(true);
    expect(phone?.contactPurpose).toBe('Business outreach');

    const email = result.find(r => r.type === 'email');
    expect(email?.value).toBe('rajvistock@gmail.com');
    expect(email?.role).toBe('CEO');
  });

  it('Test 4: Ignore long IDs and random numeric garbage', () => {
    const input = "00060340004686, 00004333, 40803009, 079-40803030";
    const result = testExtract(input);
    const phones = result.filter(r => r.type === 'phone').map(r => r.value);
    
    expect(phones).toEqual(["079-40803030"]);
  });

  it('Test 5: Standard Mobile', () => {
    const input = "+91 9375663900";
    const result = testExtract(input);
    const phones = result.filter(r => r.type === 'phone').map(r => r.value);
    
    expect(phones).toEqual(["+91 9375663900"]);
  });

  it('Classifies Compliance correctly', () => {
    const input = "<body><tr><td>Compliance Officer</td><td>Ravi Patel</td><td>079-11112222</td></tr></body>";
    const result = testExtract(input);
    
    const phone = result.find(r => r.type === 'phone');
    expect(phone?.role).toBe('Compliance Officer');
    expect(phone?.isOutreachRelevant).toBe(false);
    expect(phone?.contactPurpose).toBe('Compliance/grievance only');
  });

});
