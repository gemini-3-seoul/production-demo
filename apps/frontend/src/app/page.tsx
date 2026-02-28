"use client";

import { useEffect, useState } from "react";

type User = { id: number; name: string; created_at: string };

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setName("");
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-black">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Users from SQLite</h1>
        <ul className="mb-6 space-y-2">
          {users.map((u) => (
            <li key={u.id} className="p-3 bg-gray-100 rounded-lg flex justify-between">
              <span className="font-medium">{u.name}</span>
              <span className="text-xs text-gray-400">{u.created_at}</span>
            </li>
          ))}
          {users.length === 0 && <li className="text-gray-500 italic">No users found.</li>}
        </ul>
        <form onSubmit={handleAddUser} className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-2 border rounded-lg focus:outline-blue-500"
            placeholder="New user name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
