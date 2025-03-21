import { Link, useLocation } from "wouter";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar";

export function NavMenu() {
  const [location] = useLocation();

  return (
    <Menubar className="px-2 lg:px-4 border-b">
      <MenubarMenu>
        <MenubarTrigger className={location === "/" ? "bg-accent" : ""}>
          <Link href="/">Home</Link>
        </MenubarTrigger>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className={location === "/projects" ? "bg-accent" : ""}>
          <Link href="/projects">Projects</Link>
        </MenubarTrigger>
      </MenubarMenu>
    </Menubar>
  );
}
