import React from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MainLayoutProps {
  account: string;
  leelasBalance: number;
  onLogout: () => void;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  account,
  leelasBalance,
  onLogout,
  children,
}) => {
  const [profileName, setProfileName] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempName, setTempName] = React.useState("");

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        {/* Left: Wallet info + Profile Name */}
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold">
              Trainer: {profileName || shortenAddress(account)}
            </h2>
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-yellow-400 transition"
            >
              <Pencil size={18} />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">Leelas: {leelasBalance}</p>
        </div>

        {/* Middle: Navigation */}
        <div className="flex space-x-6 text-lg font-semibold">
          <Link to="/home" className="hover:text-yellow-400 transition">
            Home
          </Link>
          <Link to="/marketplace" className="hover:text-yellow-400 transition">
            Marketplace
          </Link>
          <Link to="/mypokemon" className="hover:text-yellow-400 transition">
            Pokémon
          </Link>
        </div>

        {/* Right: Notifications + Theme + Logout */}
        <div className="flex items-center space-x-4">
          <button className="relative">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
            </svg>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <span className="text-gray-900 font-bold text-lg">⚡</span>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Edit Name Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Trainer Name</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter new trainer name"
              className="text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (tempName.trim()) {
                  setProfileName(tempName.trim());
                  setTempName("");
                  setIsEditing(false);
                }
              }}
              className="text-neutral-950 hover:opacity-80 transition"
            >
              Save changes
            </Button>
            <Button
              onClick={() => setIsEditing(false)}
              className="bg-neutral-900 text-gray-300 border border-gray-600 hover:bg-neutral-800 transition"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
};

export default MainLayout;
