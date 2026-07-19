import { useState } from 'react';
import { AppBar } from '@/components/AppBar';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useQueries';
import { useMutations } from '@/hooks/useMutations';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun, User, Users, Info, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { identity, changeIdentity, canChangeIdentity } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: members } = useMembers();
  const { addMember, renameMember, deleteMember } = useMutations();
  
  const [isChangingIdentity, setIsChangingIdentity] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const name = newMemberName.trim();
    if (members?.some(m => m.current_name === name)) {
      alert("Name already exists");
      return;
    }
    addMember.mutate({ original_name: name, current_name: name }, {
      onSuccess: () => setNewMemberName("")
    });
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    renameMember.mutate({ id, current_name: editName.trim() }, {
      onSuccess: () => {
        setEditingMemberId(null);
        setEditName("");
      }
    });
  };

  return (
    <div className="min-h-[100dvh] pt-24 pb-24 px-4 flex flex-col max-w-md mx-auto relative gap-6">
      <AppBar title="Settings" showRefresh={false} />
      
      {/* Profile Card */}
      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 flex gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" title="Synced" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full glass-panel-heavy border-primary/20 flex items-center justify-center text-2xl font-bold bg-primary/5 text-primary">
              {identity?.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Identity</p>
              <h2 className="text-2xl font-bold">{identity}</h2>
            </div>
          </div>
          
          {canChangeIdentity && (
            <button 
              onClick={() => setIsChangingIdentity(true)}
              className="glass-button w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
            >
              <User size={16} /> Change Identity (1 left)
            </button>
          )}
        </div>
      </div>

      {/* Theme Card */}
      <div className="glass-panel rounded-3xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <span className="font-semibold">Appearance</span>
        </div>
        <div className="flex bg-white/20 dark:bg-black/40 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setTheme('light')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-muted-foreground'}`}
          >
            Light
          </button>
          <button 
            onClick={() => setTheme('dark')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${theme === 'dark' ? 'bg-black text-white shadow-sm border border-white/10' : 'text-muted-foreground'}`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Members Card */}
      <div className="glass-panel rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Users size={20} />
          </div>
          <span className="font-semibold text-lg">Members</span>
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Add new member..."
            value={newMemberName}
            onChange={e => setNewMemberName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddMember()}
            className="glass-input flex-1 text-sm py-3"
          />
          <button 
            onClick={handleAddMember}
            disabled={addMember.isPending || !newMemberName.trim()}
            className="glass-button bg-primary/10 text-primary border-primary/20 px-4 rounded-xl font-medium"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex flex-col mt-2 divide-y divide-white/10">
          {members?.map(m => (
            <div key={m.id} className="py-3 flex items-center justify-between">
              {editingMemberId === m.id ? (
                <div className="flex gap-2 flex-1 mr-2">
                  <input 
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="glass-input flex-1 py-1 px-3 text-sm h-8"
                    autoFocus
                  />
                  <button onClick={() => handleRename(m.id)} className="text-green-500 bg-green-500/10 p-1.5 rounded-lg border border-green-500/20"><CheckIcon size={14} /></button>
                  <button onClick={() => setEditingMemberId(null)} className="text-muted-foreground bg-white/10 p-1.5 rounded-lg"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-medium">{m.current_name}</span>
                  {m.is_preset && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Preset</span>}
                </div>
              )}

              {editingMemberId !== m.id && (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { setEditingMemberId(m.id); setEditName(m.current_name); }}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  {!m.is_preset && (
                    <button 
                      onClick={() => { if(confirm(`Delete ${m.current_name}?`)) deleteMember.mutate(m.id) }}
                      className="p-2 text-destructive/70 hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="glass-panel rounded-3xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
          <Info size={20} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-bold">BabySplitter v1.0</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A premium, personal shared expense tracker built for close friends.
            Real-time sync powered by Supabase.
          </p>
          <p className="text-xs text-muted-foreground/70 font-medium mt-0.5">
            Developed by <span className="text-primary font-semibold">benzavraar</span>
          </p>
        </div>
      </div>

      {/* Identity Change Modal */}
      <AnimatePresence>
        {isChangingIdentity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsChangingIdentity(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm glass-panel-heavy rounded-3xl p-6 flex flex-col gap-4 overflow-hidden"
            >
              <h2 className="text-xl font-bold text-center">Change Identity</h2>
              <div className="p-3 bg-orange-500/10 text-orange-600 rounded-2xl text-xs font-medium border border-orange-500/20 text-center leading-relaxed">
                Warning: You can only change your identity once after initial selection. Choose carefully.
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {members?.filter(m => m.is_preset).map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      if(changeIdentity(member.current_name)) {
                        setIsChangingIdentity(false);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-sm font-semibold transition-all ${member.current_name === identity ? 'bg-primary/20 border-primary/50 text-foreground' : 'glass-button'}`}
                  >
                    {member.current_name}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setIsChangingIdentity(false)}
                className="mt-2 w-full py-3 rounded-xl glass-button font-semibold text-sm"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function CheckIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="20 6 9 17 4 12"></polyline></svg>;
}
