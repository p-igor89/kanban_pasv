'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, UserPlus, Crown, Shield, Eye, User, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Member {
  id: string;
  board_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
  profile: Profile;
}

interface BoardMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  currentUserRole: 'owner' | 'admin' | 'member' | 'viewer';
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const roleColors = {
  owner: 'text-yellow-600 dark:text-yellow-400',
  admin: 'text-purple-600 dark:text-purple-400',
  member: 'text-blue-600 dark:text-blue-400',
  viewer: 'text-gray-600 dark:text-gray-400',
};

export default function BoardMembersModal({
  isOpen,
  onClose,
  boardId,
  currentUserRole,
}: BoardMembersModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, boardId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boards/${boardId}/members`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch members');
      }

      setMembers(data.members);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite member');
      }

      setMembers((prev) => [...prev, data.member]);
      setInviteEmail('');
      toast.success('Member invited!');
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      const response = await fetch(`/api/boards/${boardId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
      toast.success('Role updated');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from this board?`)) return;

    try {
      const response = await fetch(`/api/boards/${boardId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success('Member removed');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Board Members</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Invite Form */}
          {canManageMembers && (
            <form onSubmit={handleInvite} className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invite Member
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Invite
                </button>
              </div>
            </form>
          )}

          {/* Members List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const RoleIcon = roleIcons[member.role];
                const isOwner = member.role === 'owner';
                const canEdit = canManageMembers && !isOwner;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        {member.profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.profile.avatar_url}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {(member.profile.display_name ||
                              member.profile.email)?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.profile.display_name || member.profile.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {member.profile.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canEdit ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(
                              member.id,
                              e.target.value as 'admin' | 'member' | 'viewer'
                            )
                          }
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <div
                          className={`flex items-center gap-1 text-sm ${roleColors[member.role]}`}
                        >
                          <RoleIcon className="h-4 w-4" />
                          <span>{roleLabels[member.role]}</span>
                        </div>
                      )}

                      {canEdit && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.profile.email)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
