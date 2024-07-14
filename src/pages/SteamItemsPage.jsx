import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const fetchSteamItems = async () => {
  const response = await fetch("https://api.lzt.market/steam", {
    headers: {
      Authorization: "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJzdWIiOjI0OTc5OTUsImlzcyI6Imx6dCIsImV4cCI6MCwiaWF0IjoxNzE0MTgwMDA4LCJqdGkiOjU1NzQ3OCwic2NvcGUiOiJiYXNpYyByZWFkIHBvc3QgY29udmVyc2F0ZSBtYXJrZXQifQ.evWUpjExi01yNqsKdaOyF27IgVfArJ0jU40ub1Q8WAvj7WmrpjnEsLTDrM0DqY9SfeZoqS0Wh9hlrl1ezXL6JYOZysrhj_M-uXVm3I-xngnyHGfMIY_6qKGB3-jwaNpOEUhts9tONorBwj32OWfXudH6FFq0TapqkcDd4gxNxxM",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch Steam items");
  }
  const data = await response.json();
  return data.items;
};

const getGuaranteePeriod = (value) => {
  switch (value) {
    case -1:
      return "12 hours";
    case 0:
      return "24 hours";
    case 1:
      return "3 days";
    default:
      return "Unknown";
  }
};

const SteamItemsPage = () => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [filter, setFilter] = useState("");

  const { data: items, isLoading, error } = useQuery({
    queryKey: ["steamItems"],
    queryFn: fetchSteamItems,
  });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedItems = items
    ? [...items].sort((a, b) => {
        if (sortColumn) {
          const aValue = a[sortColumn];
          const bValue = b[sortColumn];
          if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
          if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
      })
    : [];

  const filteredItems = sortedItems.filter(
    (item) =>
      item.title_en.toLowerCase().includes(filter.toLowerCase()) ||
      item.account_country.toLowerCase().includes(filter.toLowerCase()) ||
      item.item_origin.toLowerCase().includes(filter.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Steam Items</h1>
      <p className="text-gray-600 mb-4">List of Steam items fetched from the API</p>
      <Input
        type="text"
        placeholder="Filter items..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4"
      />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort("item_id")}>Link</TableHead>
              <TableHead onClick={() => handleSort("title_en")}>Title</TableHead>
              <TableHead onClick={() => handleSort("price")}>Price</TableHead>
              <TableHead onClick={() => handleSort("item_origin")}>Origin</TableHead>
              <TableHead onClick={() => handleSort("account_country")}>Country</TableHead>
              <TableHead onClick={() => handleSort("published_date")}>Published Date</TableHead>
              <TableHead onClick={() => handleSort("account_last_activity")}>Last Activity</TableHead>
              <TableHead onClick={() => handleSort("extended_guarantee")}>Guarantee</TableHead>
              <TableHead onClick={() => handleSort("account_full_games.list.252490.playtime_forever")}>Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.item_id}>
                <TableCell>
                  <a href={`https://lzt.market/${item.item_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Link
                  </a>
                </TableCell>
                <TableCell>{item.title_en}</TableCell>
                <TableCell>{item.price.toFixed(2)}</TableCell>
                <TableCell>{item.item_origin}</TableCell>
                <TableCell>{item.account_country}</TableCell>
                <TableCell>{new Date(item.published_date * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })}</TableCell>
                <TableCell>{new Date(item.account_last_activity * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })}</TableCell>
                <TableCell>{getGuaranteePeriod(item.extended_guarantee)}</TableCell>
                <TableCell>{item.account_full_games.list["252490"]?.playtime_forever.toFixed(2) || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SteamItemsPage;