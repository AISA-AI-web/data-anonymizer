import { describe, expect, it } from 'vitest';
import { anonymizeText } from './anonymizeText';
import { findNames } from './findNames';
import { parseKeyFile, serializeKey, WrongPassphraseError } from './keyfile';
import { reidentifyText } from './reidentify';
import { SAMPLE_TEXT } from './sample';

const names = (text: string) => findNames(text).map((n) => n.text);

describe('finding names in text', () => {
  it('finds full names, names after titles and names joined by particles', () => {
    const found = names(
      'Dear Ms Khan, I am writing about Ahmed Al Mansoori in Grade 7. Fatima bint Rashid and Priya Sharma said ' +
        'he was upset. His mother, Mrs. Layla Hassan, called. Aisha Al-Hashimi led the group.',
    );
    expect(found).toEqual(
      expect.arrayContaining(['Khan', 'Ahmed Al Mansoori', 'Fatima bint Rashid', 'Priya Sharma', 'Layla Hassan', 'Aisha Al-Hashimi']),
    );
  });

  it('finds names the language model does not know, from a list and from context', () => {
    const found = names('Hamdan and Reem worked with Tanvi. My son Hamad is in 8B. Kofi Mensah wrote about Dubai.');
    expect(found).toEqual(expect.arrayContaining(['Hamdan', 'Reem', 'Tanvi', 'Hamad', 'Kofi Mensah']));
  });

  it('reads the grammar: a question’s “Will” is not a name, and subjects, places and tools are not people', () => {
    const found = names(
      'Will Grace Lee and Noor attend? The Student Council met in Abu Dhabi on Tuesday. ' +
        'In English and Science we used ChatGPT and Google Classroom. Summer break starts in June.',
    );
    expect(found).toEqual(expect.arrayContaining(['Grace Lee', 'Noor']));
    for (const notAName of ['Will', 'Will Grace Lee', 'Council', 'Abu Dhabi', 'English', 'Science', 'ChatGPT', 'Google', 'Summer', 'June']) {
      expect(found).not.toContain(notAName);
    }
  });

  it('finds a name used as a label at the start of a line', () => {
    expect(names('Notes from today\nYasmin: needs help with fractions.\nZubair: confident.')).toEqual(
      expect.arrayContaining(['Yasmin', 'Zubair']),
    );
  });

  it('finds the people in the made-up example', () => {
    const found = names(SAMPLE_TEXT);
    expect(found.length).toBeGreaterThanOrEqual(5);
    expect(anonymizeText(SAMPLE_TEXT, found, { hideContacts: true }).text).not.toMatch(/Omar|Layla|Hessa|Arjun/);
  });
});

describe('anonymizing text', () => {
  const text =
    'Ahmed Al Mansoori and Sara Khan presented. Ahmed spoke clearly; Ms Khan’s daughter Sara asked questions. ' +
    'Al Mansoori’s parents (ahmed.parent@example.com, 050 123 4567) will visit.';

  it('gives one person one code, including short forms of the name', () => {
    const r = anonymizeText(text, ['Ahmed Al Mansoori', 'Sara Khan'], { hideContacts: true });
    expect(r.people).toHaveLength(2);
    const ahmed = r.people.find((p) => p.name === 'Ahmed Al Mansoori')!.token;
    const sara = r.people.find((p) => p.name === 'Sara Khan')!.token;
    expect(ahmed).toMatch(/^PERSON-\d{3}$/);
    expect(r.text).toBe(
      `${ahmed} and ${sara} presented. ${ahmed} spoke clearly; Ms ${sara}’s daughter ${sara} asked questions. ` +
        `${ahmed}’s parents (EMAIL-001, PHONE-001) will visit.`,
    );
    expect(r.contacts).toBe(2);
  });

  it('gives a shared first name its own code', () => {
    const r = anonymizeText('Ahmed Saleh and Ahmed Khan were absent. Ahmed came later.', ['Ahmed Saleh', 'Ahmed Khan'], {
      hideContacts: false,
    });
    expect(r.people.map((p) => p.name).sort()).toEqual(['Ahmed', 'Ahmed Khan', 'Ahmed Saleh']);
    expect(r.text).not.toMatch(/Ahmed/);
  });

  it('matches whole words only, and leaves lower-case words alone', () => {
    const r = anonymizeText('Sara and Sarah: grace and Grace, will and Will.', ['Sara', 'Grace', 'Will'], { hideContacts: false });
    expect(r.text).toMatch(/^PERSON-\d{3} and Sarah: grace and PERSON-\d{3}, will and PERSON-\d{3}\.$/);
  });

  it('keeps words the user said are not names', () => {
    const r = anonymizeText('Ahmed Al Mansoori lives near Al Mansoori Street.', ['Ahmed Al Mansoori'], {
      hideContacts: false,
      ignore: ['Al Mansoori', 'Mansoori'],
    });
    expect(r.text).toMatch(/^PERSON-001 lives near Al Mansoori Street\.$/);
  });

  it('leaves contact details when asked to', () => {
    const r = anonymizeText('Write to a@example.com', [], { hideContacts: false });
    expect(r.text).toBe('Write to a@example.com');
    expect(Object.keys(r.key.tokens)).toHaveLength(0);
  });

  it('locks with a passphrase and unlocks back to the original text', async () => {
    const r = anonymizeText(text, ['Ahmed Al Mansoori', 'Sara Khan'], { hideContacts: true });
    const locked = await serializeKey(r.key, 'correct horse battery');
    expect(locked).not.toContain('Mansoori');
    await expect(parseKeyFile(locked, 'wrong passphrase')).rejects.toBeInstanceOf(WrongPassphraseError);
    const key = await parseKeyFile(locked, 'correct horse battery');
    const back = reidentifyText(r.text, key).text;
    // Short forms come back as the full name; everything else is exactly as it was.
    expect(back).toBe(
      'Ahmed Al Mansoori and Sara Khan presented. Ahmed Al Mansoori spoke clearly; Ms Sara Khan’s daughter Sara Khan asked ' +
        'questions. Ahmed Al Mansoori’s parents (ahmed.parent@example.com, 050 123 4567) will visit.',
    );
  });

  it('unlocks an AI’s answer that changed the codes slightly', () => {
    const r = anonymizeText('Reem Saleh needs support.', ['Reem Saleh'], { hideContacts: false });
    expect(reidentifyText('person_001 should get extra time.', r.key).text).toBe('Reem Saleh should get extra time.');
  });
});
