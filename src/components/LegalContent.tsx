// 약관 본문 표시: "## 제목", "### 소제목", "- 목록", 빈 줄로 문단 구분
export default function LegalContent({ content }: { content: string }) {
  const blocks = content.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => (
        <Block key={i} lines={block.split("\n").filter((l) => l.trim())} />
      ))}
    </div>
  );
}

function Block({ lines }: { lines: string[] }) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length) {
      out.push(
        <ul
          key={`ul-${out.length}`}
          className="flex list-disc flex-col gap-1.5 pl-5 marker:text-label-assist"
        >
          {list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flushList();
    if (line.startsWith("### ")) {
      out.push(
        <h3 key={out.length} className="mt-2 t-body-1 !font-bold text-label">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      out.push(
        <h2 key={out.length} className="mt-6 t-heading-2 text-label">
          {line.slice(3)}
        </h2>,
      );
    } else {
      out.push(<p key={out.length}>{line}</p>);
    }
  }
  flushList();

  return (
    <div className="flex flex-col gap-2 t-body-3 text-label-neutral">{out}</div>
  );
}
