import Image from "next/image";

type Props = {
  layout: {
    title: string;
    bullets: string[];
    notes?: string;
    image: string | null;
  };
  id?: string;
};

export default function RoomLayout({ layout, id }: Props) {
  return (
    <section
      id={id}
      className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2"
    >
      <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-lg">
        {layout.image ? (
          <Image
            src={layout.image}
            alt={`${layout.title} floor plan`}
            width={920}
            height={560}
            className="h-auto w-full object-contain"
          />
        ) : (
          <div className="flex h-full min-h-[240px] items-center justify-center bg-slate-100 text-sm text-slate-500">
            Layout illustration coming soon
          </div>
        )}
      </div>
      <div>
        <h2 className="mb-4 text-3xl font-serif text-[#0F2148]">{layout.title}</h2>
        <ul className="space-y-2 text-[#0F2148]/85">
          {layout.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span aria-hidden="true" className="text-[#d9a64f]">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        {layout.notes ? (
          <p className="mt-4 text-sm text-[#0F2148]/60">{layout.notes}</p>
        ) : null}
      </div>
    </section>
  );
}
