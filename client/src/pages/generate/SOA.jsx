import GeneratorScaffold from '../../components/GeneratorScaffold.jsx';
import { api } from '../../api/client.js';

export default function GenerateSOA() {
  return (
    <GeneratorScaffold
      title="Generate SOA"
      sub="Risk Insurance Statement of Advice — house format"
      icon="📄"
      accent="var(--accent)"
      blurb="Drafts a Risk Insurance Statement of Advice from the client's file, existing cover and your notes — in the Lakeside house format, with the reasoning spelled out."
      generateLabel="✨ Generate SOA"
      onGenerate={async ({ clientId, instructions }) => {
        const r = await api.post('/plans/generate', {
          clientId,
          save: true,
          docType: 'soa',
          instructions:
            "Write a Risk Insurance Statement of Advice (SOA) in the firm's Risk Insurance SOA house format. " +
            'Cover: the client’s situation and objectives; existing cover; recommended cover (Life, TPD, Trauma, Income Protection) with amounts; the rationale/“why” behind each recommendation; replacement of any cover being cancelled; premiums/costs; and next steps. ' +
            'Use inclusive beneficiary framing (partner & children) and appropriately hedged, compliant language.' +
            (instructions ? ` Adviser notes: ${instructions}` : ''),
        });
        return { text: r.content, saved: r.saved };
      }}
    />
  );
}
