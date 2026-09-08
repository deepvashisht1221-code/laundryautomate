import { Outlet } from "react-router-dom";
import { BottomTabBar } from "@/components/BottomTabBar";

export function AppLayout() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 overflow-y-auto px-screen py-screen">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
