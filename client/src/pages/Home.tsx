/**
 * Home page — lists the user's groups and lets them create/join a group.
 * From here users can launch a swiping session.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Users,
  LogIn,
  MapPin,
  Loader2,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { Header } from "../components/Header";
import { useAuthStore } from "../store/auth.store";
import type { Group } from "../types";

type Modal = "none" | "create" | "join" | "launch";

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [modal, setModal] = useState<Modal>("none");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: api.groups.list,
  });

  const createGroup = useMutation({
    mutationFn: () => api.groups.create(groupName),
    onSuccess: (g) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(`Group "${g.name}" created! Code: ${g.inviteCode}`);
      setModal("none");
      setGroupName("");
    },
    onError: () => toast.error("Failed to create group"),
  });

  const joinGroup = useMutation({
    mutationFn: () => api.groups.join(inviteCode),
    onSuccess: (g) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success(`Joined "${g.name}"!`);
      setModal("none");
      setInviteCode("");
    },
    onError: () => toast.error("Invalid invite code"),
  });

  const launchSession = useMutation({
    mutationFn: () =>
      api.sessions.create({
        groupId: selectedGroup!.id,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      }),
    onSuccess: ({ session }) => {
      setModal("none");
      navigate(`/session/${session.id}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to launch session";
      toast.error(msg);
    },
  });

  function useCurrentLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success("Location set!");
      },
      () => toast.error("Could not get location"),
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-5 pb-8 max-w-lg mx-auto w-full mt-2">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="font-display font-black text-3xl text-white">
            Hey {user?.displayName?.split(" ")[0]} 👋
          </h2>
          <p className="text-gray-400 mt-1">
            Pick a group and let's decide where to eat.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-8">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setModal("create")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-500 text-white font-semibold"
          >
            <Plus size={18} /> New Group
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setModal("join")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl glass text-gray-300 font-semibold hover:text-white transition-colors"
          >
            <LogIn size={18} /> Join Group
          </motion.button>
        </div>

        {/* Groups list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="text-brand-500 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>No groups yet. Create one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <motion.div
                key={group.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="glass rounded-2xl p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => {
                  setSelectedGroup(group);
                  setModal("launch");
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-brand-700/60 flex items-center justify-center font-display font-black text-xl text-brand-300">
                  {group.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{group.name}</p>
                  <p className="text-gray-400 text-sm">
                    {group.members.length} member
                    {group.members.length !== 1 ? "s" : ""} · {group.inviteCode}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-500 shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal !== "none" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setModal("none")}
          >
            <motion.div
              initial={{ y: 32, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 32, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass rounded-3xl p-6 w-full max-w-sm max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Create Group */}
              {modal === "create" && (
                <>
                  <h3 className="font-display font-black text-2xl text-white mb-5">
                    New Group
                  </h3>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Group name (e.g. Work Lunch Crew)"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 mb-4"
                  />
                  <button
                    onClick={() => createGroup.mutate()}
                    disabled={!groupName.trim() || createGroup.isPending}
                    className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold disabled:opacity-50"
                  >
                    {createGroup.isPending ? "Creating…" : "Create Group"}
                  </button>
                </>
              )}

              {/* Join Group */}
              {modal === "join" && (
                <>
                  <h3 className="font-display font-black text-2xl text-white mb-5">
                    Join Group
                  </h3>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Invite code (e.g. DEMO1234)"
                    value={inviteCode}
                    onChange={(e) =>
                      setInviteCode(e.target.value.toUpperCase())
                    }
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 font-mono tracking-widest mb-4"
                  />
                  <button
                    onClick={() => joinGroup.mutate()}
                    disabled={inviteCode.length < 6 || joinGroup.isPending}
                    className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold disabled:opacity-50"
                  >
                    {joinGroup.isPending ? "Joining…" : "Join Group"}
                  </button>
                </>
              )}

              {/* Launch Session */}
              {modal === "launch" && selectedGroup && (
                <>
                  <h3 className="font-display font-black text-2xl text-white mb-1">
                    Start Swiping
                  </h3>
                  <p className="text-gray-400 text-sm mb-5">
                    {selectedGroup.name}
                  </p>

                  <button
                    onClick={useCurrentLocation}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl glass text-brand-400 font-semibold mb-3 hover:text-brand-300 transition-colors"
                  >
                    <MapPin size={16} />
                    Use My Location
                  </button>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <input
                      type="number"
                      placeholder="Latitude"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full min-w-0 bg-white/10 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Longitude"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full min-w-0 bg-white/10 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 text-sm"
                    />
                  </div>

                  <button
                    onClick={() => launchSession.mutate()}
                    disabled={!lat || !lng || launchSession.isPending}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 text-white font-display font-black text-lg disabled:opacity-50"
                  >
                    {launchSession.isPending
                      ? "Fetching restaurants…"
                      : "Find Food! 🍗"}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
