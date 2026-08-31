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
      onGenerate={async ({ clientId, instructions, onProgress }) => {
        // Streamed: a 14-section SOA runs for minutes, so the server reports
        // each section as it lands rather than leaving the page on a spinner.
        const r = await api.postStream(
          '/plans/generate-risk-soa',
          { clientId, save: true, instructions, stream: true },
          (evt) => { if (evt.type === 'progress') onProgress?.(evt); }
        );
        return { text: r.content, saved: r.saved };
      }}
    />
  );
}
