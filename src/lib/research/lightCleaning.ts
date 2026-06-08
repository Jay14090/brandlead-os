import { prisma } from '../prisma';

export async function lightCleaning(jobId: string) {
  // Pull all contacts and clean obvious garbage
  
  const contacts = await prisma.contactCandidate.findMany({ where: { lead: { jobId } } });
  
  for (const c of contacts) {
    let shouldReject = false;
    let notes = c.notes || '';
    
    if (c.type === 'phone') {
      const val = c.normalizedValue;
      if (val.length < 8 || val.length > 15) {
        shouldReject = true;
        notes += ' Invalid length for phone. ';
      }
      if (/00000/.test(val) || /1234567/.test(val) || /9876543/.test(val)) {
        shouldReject = true;
        notes += ' Obvious fake phone pattern. ';
      }
      // ID formats
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)) {
        shouldReject = true; // PAN Card
        notes += ' Appears to be PAN card. ';
      }
    }
    
    if (c.type === 'email') {
      const val = c.normalizedValue;
      if (!val.includes('@') || !val.includes('.')) {
        shouldReject = true;
        notes += ' Invalid email format. ';
      }
      if (val.startsWith('example@') || val.startsWith('test@') || val.endsWith('example.com')) {
        shouldReject = true;
        notes += ' Test/Example email. ';
      }
    }
    
    if (shouldReject) {
      await prisma.contactCandidate.update({
        where: { id: c.id },
        data: { status: 'Rejected', notes: notes.trim() }
      });
    }
  }
  
  // Clean person contacts as well
  const pContacts = await prisma.personContactEvidence.findMany({ where: { leadId: { in: (await prisma.lead.findMany({ where: { jobId } })).map(l => l.id) } } });
  for (const pc of pContacts) {
    let shouldReject = false;
    let notes = pc.notes || '';
    
    if (pc.contactType === 'phone') {
      const val = pc.normalizedValue;
      if (val.length < 8 || val.length > 15) shouldReject = true;
      if (/00000/.test(val)) shouldReject = true;
    }
    
    if (shouldReject) {
      await prisma.personContactEvidence.update({
        where: { id: pc.id },
        data: { status: 'Rejected', notes: notes + ' Obvious garbage.' }
      });
    }
  }
}
