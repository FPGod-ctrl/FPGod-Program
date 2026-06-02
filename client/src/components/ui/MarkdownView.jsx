import ReactMarkdown from 'react-markdown';

export default function MarkdownView({ children }) {
  return (
    <div className="md">
      <ReactMarkdown>{children || '_No content._'}</ReactMarkdown>
    </div>
  );
}
