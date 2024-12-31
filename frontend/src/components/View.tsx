interface Props {
  width?: number;
  height: number;
  className?: string;
  children: React.ReactNode;
}
export default function View({ width, height, className, children }: Props) {
  return (
    <section
      style={{ width, height }}
      className={"p-1 border relative " + className}
    >
      {children}
    </section>
  );
}
