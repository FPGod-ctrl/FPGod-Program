import { useState } from 'react';
import GeneratorScaffold from '../../components/GeneratorScaffold.jsx';
import { Select, TextArea } from '../../components/ui/Field.jsx';
import { api } from '../../api/client.js';

export default function GenerateFollowUps() {
  const [type, setType] = useState('meeting');
  const [text, setText] = useState('');

  return (
    <GeneratorScaffold
      title="Follow-on & Phone Call Emails"
      sub="Draft a follow-up from meeting notes or a call"
      icon="✉️"
      accent="var(--primary)"
      blurb="Paste the meeting transcript or a few call notes, choose the type, and get a client-ready email in your house style. The detailed follow-on and the short phone-call follow-up are written differently."
      generateLabel="✨ Generate Email"
      extra={
        <>
          <Select
            label="Email type"
            options={[
              { value: 'meeting', label: 'Follow-on from meeting (detailed)' },
              { value: 'phone', label: 'Phone-call follow-up (short & warm)' },
            ]}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <TextArea
            label="Meeting transcript / call notes"
            placeholder="Paste the transcript, or type a few notes about what was discussed…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            style={{ minHeight: 200 }}
          />
        </>
      }
      onGenerate={async ({ clientId, instructions }) => {
        if (!text.trim()) throw new Error('Paste the meeting notes or transcript first');
        const r = await api.post('/emails/draft', {
          clientId: clientId || null,
          text,
          type,
          instructions,
          save: true,
        });
        return { text: `Subject: ${r.subject}\n\n${r.body}`, saved: r.saved };
      }}
    />
  );
}
