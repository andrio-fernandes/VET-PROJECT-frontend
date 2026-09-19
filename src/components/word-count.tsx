import { countWords } from "@/constants";

interface WordCountProps {
  value?: string;
  max: number;
}

// Small shared label that renders "{words}/{max}" while the form field is
// being filled in. Reused by the FAQ and Video create/edit forms. The
// surrounding white-space is preserved so pages can drop it inline without
// any change to their markup.
export default function WordCount({ value = "", max }: WordCountProps) {
  return <div className="word-counter">{countWords(value)}/{max} word</div>;
}
