import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ModeToggle } from "~/components/mode-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { authClient } from "~/lib/auth-client.ts";

type MenuItem = {
  title: string;
  url: string;
  items?: { title: string; url: string }[];
};

const menuItems: MenuItem[] = [
  {
    title: "Kontrolna tabla",
    url: "/admin",
  },
  {
    title: "Proizvodi",
    url: "/admin/products",
  },
  {
    title: "Stolovi",
    url: "/admin/tables",
  },
  {
    title: "Cene",
    url: "/admin/pricing",
  },
  {
    title: "Video",
    url: "/admin/videos",
    items: [
      {
        title: "Generacija",
        url: "/admin/videos/generacija",
      },
      {
        title: "Kampanje",
        url: "/admin/campaigns",
      },
    ],
  },
  {
    title: "Podešavanja",
    url: "/admin/settings",
  },
];

export function AdminSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await authClient.signOut();

      if (response.error) {
        toast.error("Greška pri odjavi");
        return;
      }

      toast.success("Uspešno ste se odjavili");
      navigate({ to: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Greška pri odjavi");
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "superadmin":
        return "destructive";
      case "admin":
        return "default";
      case "staff":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "superadmin":
        return "Superadmin";
      case "admin":
        return "Admin";
      case "staff":
        return "Osoblje";
      default:
        return "Korisnik";
    }
  };

  const username = session?.user?.name || "Korisnik";
  const role = (session?.user as any)?.role;
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <>
      <Sidebar side="right">
        <SidebarHeader>
          <div className="flex justify-end">
            <ModeToggle />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        onClick={handleNavClick}
                        activeProps={{
                          className:
                            "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                        }}
                        activeOptions={{
                          exact: true,
                        }}
                      >
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.items?.length ? (
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <Link
                                to={subItem.url}
                                onClick={handleNavClick}
                                activeProps={{
                                  className:
                                    "bg-sidebar-accent text-sidebar-accent-foreground",
                                }}
                                activeOptions={{
                                  exact: true,
                                }}
                              >
                                {subItem.title}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="h-auto py-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start flex-1 gap-0.5">
                      <span className="text-sm font-medium truncate w-full">
                        {username}
                      </span>
                      <Badge
                        variant={getRoleBadgeVariant(role)}
                        className="text-xs px-2 py-0"
                      >
                        {getRoleLabel(role)}
                      </Badge>
                    </div>
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end">
                  <DropdownMenuItem onClick={() => setShowLogoutDialog(true)}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Odjavi se</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Da li ste sigurni?</AlertDialogTitle>
            <AlertDialogDescription>
              Želite da se odjavite iz sistema?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Odjavi se
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
