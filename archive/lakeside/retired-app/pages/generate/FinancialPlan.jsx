import GeneratorScaffold from '../../components/GeneratorScaffold.jsx';
import { api } from '../../api/client.js';

export default function GenerateFinancialPlan() {
  return (
    <GeneratorScaffold
      title="Generate Financial Plan"
      sub="Comprehensive plan from the client's file"
      icon="📈"
      accent="#6366f1"
      blurb="Builds a full financial plan — situation, goals, and strategy across super, investments, insurance and estate — with clear recommendations and reasoning."
      generateLabel="✨ Generate Plan"
      onGenerate={async ({ clientId, instructions }) => {
        const r = await api.post('/plans/generate', {
          clientId,
          save: true,
          docType: 'plan',
          instructions:
            'Produce a comprehensive financial plan covering: current situation and net position; goals & objectives; ' +
            'strategy across superannuation, investments, personal insurance and estate planning; and clear recommendations with the reasoning behind each. ' +
            'Keep the maths grounded in the figures on file — never invent numbers.' +
            (instructions ? ` Adviser notes: ${instructions}` : ''),
        });
        return { text: r.content, saved: r.saved };
      }}
    />
  );
}
