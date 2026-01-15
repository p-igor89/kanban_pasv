'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Bell, Mail, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import FormInput from '@/components/ui/FormInput';
import AvatarUpload from '@/components/ui/AvatarUpload';
import { useFormValidation } from '@/hooks/useFormValidation';
import { fetchWithCsrf } from '@/lib/security/fetch-with-csrf';

const validationRules = {
  displayName: {
    maxLength: {
      value: 50,
      message: 'Display name must be less than 50 characters',
    },
  },
};

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  notification_preferences: {
    email_task_assigned: boolean;
    email_task_due: boolean;
    email_comments: boolean;
    email_board_invites: boolean;
  };
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [preferences, setPreferences] = useState({
    email_task_assigned: true,
    email_task_due: true,
    email_comments: true,
    email_board_invites: true,
  });

  const { getFieldError, handleBlur, validateAllFields, clearErrors } = useFormValidation<{
    displayName: string;
  }>(validationRules);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();

      if (response.ok && data.profile) {
        setProfile(data.profile);
        setDisplayName(data.profile.display_name || '');
        setPreferences({
          email_task_assigned: data.profile.notification_preferences?.email_task_assigned ?? true,
          email_task_due: data.profile.notification_preferences?.email_task_due ?? true,
          email_comments: data.profile.notification_preferences?.email_comments ?? true,
          email_board_invites: data.profile.notification_preferences?.email_board_invites ?? true,
        });
        clearErrors();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const isValid = validateAllFields({ displayName });
    if (!isValid) return;

    setSaving(true);
    try {
      const response = await fetchWithCsrf('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      toast.success('Profile saved');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetchWithCsrf('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_preferences: preferences,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save preferences');
      }

      toast.success('Preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/boards"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your profile and preferences
          </p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>

        {/* Avatar Upload */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 mb-4">
          <AvatarUpload
            currentAvatarUrl={profile?.avatar_url || null}
            displayName={displayName}
            email={profile?.email || ''}
            onUploadSuccess={(newUrl) => {
              setProfile((prev) => (prev ? { ...prev, avatar_url: newUrl } : null));
            }}
            onRemove={() => {
              setProfile((prev) => (prev ? { ...prev, avatar_url: null } : null));
            }}
            size="lg"
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Profile Photo</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload. Max 5MB.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{profile?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <FormInput
            id="displayName"
            type="text"
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={() => handleBlur('displayName', displayName)}
            error={getFieldError('displayName')}
            placeholder="Your display name"
            maxLength={50}
            helperText={`${displayName.length}/50 characters`}
          />

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Profile
          </button>
        </div>
      </div>

      {/* Email Notifications Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Mail className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Email Notifications
            </h2>
            <p className="text-sm text-gray-500">Choose when to receive email updates</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Task Assigned</p>
                <p className="text-sm text-gray-500">When a task is assigned to you</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => togglePreference('email_task_assigned')}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferences.email_task_assigned ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  preferences.email_task_assigned ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Due Date Reminder</p>
                <p className="text-sm text-gray-500">When a task is due soon</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => togglePreference('email_task_due')}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferences.email_task_due ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  preferences.email_task_due ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Comments</p>
                <p className="text-sm text-gray-500">When someone comments on your task</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => togglePreference('email_comments')}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferences.email_comments ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  preferences.email_comments ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Board Invitations</p>
                <p className="text-sm text-gray-500">When you&apos;re invited to a board</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => togglePreference('email_board_invites')}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferences.email_board_invites ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  preferences.email_board_invites ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
