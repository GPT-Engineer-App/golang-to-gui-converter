import { Home, Steam } from "lucide-react";
import Index from "./pages/Index.jsx";
import SteamItemsPage from "./pages/SteamItemsPage.jsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <Home className="h-4 w-4" />,
    page: <Index />,
  },
  {
    title: "Steam Items",
    to: "/steam-items",
    icon: <Steam className="h-4 w-4" />,
    page: <SteamItemsPage />,
  },
];