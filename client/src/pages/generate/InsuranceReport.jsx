import GeneratorScaffold from '../../components/GeneratorScaffold.jsx';

export default function GenerateInsuranceReport() {
  return (
    <GeneratorScaffold
      title="Generate Insurance Report"
      sub="Current / indicative cover summary"
      icon="🛡️"
      accent="#16a34a"
      blurb="Builds the Lakeside insurance report — a current and indicative cover summary per household — from the client's policies on file, ready to review and export as Word."
      ready={false}
      readyNote={
        'Next step: wire this to the Insurance Report Word template (clone-and-fill) so picking a client generates and downloads the filled .docx. ' +
        'The template and build script already exist — I’ll connect them to this button.'
      }
    />
  );
}
