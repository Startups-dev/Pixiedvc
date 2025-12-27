type Props = {
  facts: { title: string; value: string }[];
  id?: string;
};

export default function QuickFacts({ facts, id }: Props) {
  return (
    <section
      id={id}
      className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-10 md:grid-cols-3"
    >
      {facts.map((fact) => (
        <div
          key={fact.title}
          className="rounded-2xl border border-white/60 bg-white/70 p-6 text-center shadow backdrop-blur"
        >
          <h3 className="text-lg font-medium text-[#0F2148]">{fact.title}</h3>
          <p className="text-2xl font-semibold text-[#0F2148]/90">{fact.value}</p>
        </div>
      ))}
    </section>
  );
}
