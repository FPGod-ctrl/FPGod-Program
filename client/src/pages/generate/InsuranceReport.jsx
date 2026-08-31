import GeneratorScaffold from '../../components/GeneratorScaffold.jsx';

export default function GenerateInsuranceReport() {
  return (
    <GeneratorScaffold
      title="Generate Insurance Report"
      sub="Current / indicative cover summary"
      icon="🛡️"
      accent="#16a34a"
      blurb="Builds the insurance report — a current and indicative cover summary per household — from the client's policies on file, ready to review and export as Word."
      ready={false}
      readyNote={
        'Awaiting the Legacy Risk Advice insurance report Word template. The clone-and-fill generator already works — ' +
        'drop the Legacy template into templates/ and this button gets wired to it.'
      }
    />
  );
}
