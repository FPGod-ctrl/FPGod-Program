import GeneratorScaffold from '../../components/GeneratorScaffold.jsx';
import { api } from '../../api/client.js';

export default function GenerateSOA() {
  return (
    <GeneratorScaffold
      title="Insurance & Risk Planning"
      sub="Risk Insurance Statement of Advice"
      icon="📄"
      accent="var(--accent)"
      blurb="Drafts a risk-only Statement of Advice from the client's file, existing cover and your notes — life, TPD, trauma and income protection, with the needs analysis worked through and the reasoning behind every recommendation spelled out."
      generateLabel="✨ Generate SOA"
      onGenerate={async ({ clientId, instructions }) => {
        const r = await api.post('/plans/generate-risk-soa', {
          clientId,
          save: true,
          instructions,
        });
        return { text: r.content, saved: r.saved };
      }}
    />
  );
}
