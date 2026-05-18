import { Sidebar } from "@/components/ui/sidebar";

const DemoOne = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-[1000]">
      <Sidebar />
    </div>
  );
};

export { DemoOne };
