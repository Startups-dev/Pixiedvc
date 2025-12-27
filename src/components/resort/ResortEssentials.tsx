import { Accordion, AccordionItem } from "@/components/ui/Accordion";

type Props = {
  essentials: {
    transportation: string;
    amenities: string[];
    dining: string[];
    notices?: string[];
  };
  id?: string;
};

export default function ResortEssentials({ essentials, id }: Props) {
  const { transportation, amenities, dining, notices } = essentials;

  return (
    <section id={id} className="mx-auto max-w-5xl px-6 py-12">
      <h2 className="mb-6 text-2xl font-serif text-[#0F2148]">Resort Essentials</h2>
      <Accordion>
        <AccordionItem title="Transportation" defaultOpen>
          <p>{transportation}</p>
        </AccordionItem>
        <AccordionItem title="Amenities">
          <ul className="space-y-1 pl-5 text-[#0F2148]/80">
            {amenities.map((item) => (
              <li key={item} className="list-disc">{item}</li>
            ))}
          </ul>
        </AccordionItem>
        <AccordionItem title="Dining">
          <ul className="space-y-1 pl-5 text-[#0F2148]/80">
            {dining.map((item) => (
              <li key={item} className="list-disc">{item}</li>
            ))}
          </ul>
        </AccordionItem>
        {notices?.length ? (
          <AccordionItem title="Notices & Refurbishments">
            <ul className="space-y-1 pl-5 text-[#0F2148]/80">
              {notices.map((notice) => (
                <li key={notice} className="list-disc">
                  {notice}
                </li>
              ))}
            </ul>
          </AccordionItem>
        ) : null}
      </Accordion>
    </section>
  );
}
