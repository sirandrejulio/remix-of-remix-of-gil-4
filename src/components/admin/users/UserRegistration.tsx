import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, Sparkles, Key, User, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface UserRegistrationProps {
  onUserCreated: () => void;
  currentUserId?: string;
}

export function UserRegistration({ onUserCreated, currentUserId }: UserRegistrationProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<'admin' | 'user'>('user');

  const handleDirectRegister = async () => {
    if (!registerEmail || !registerPassword || !registerName) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (registerPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      // Call Edge Function to create user (uses Admin API, doesn't affect current session)
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: registerEmail.trim().toLowerCase(),
          password: registerPassword,
          nome: registerName,
          role: registerRole,
        },
      });

      if (response.error) {
        console.error('Edge function error:', response.error);
        toast.error(response.error.message || 'Erro ao cadastrar usuário');
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success('Usuário cadastrado com sucesso!');
      onUserCreated();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error registering user:', error);
      toast.error('Erro ao cadastrar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterRole('user');
  };

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="gap-2 bg-gradient-to-r from-primary to-primary/80"
      >
        <UserPlus className="h-4 w-4" />
        Cadastrar Usuário
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-border/30 bg-card/95 backdrop-blur-2xl">
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
          </div>
          
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
                <UserPlus className="h-5 w-5 text-primary-foreground" />
              </div>
              Cadastrar Usuário
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </DialogTitle>
            <DialogDescription>
              Crie uma nova conta de usuário diretamente no sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 relative">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Nome Completo
              </Label>
              <Input
                type="text"
                placeholder="Nome do usuário"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                className="bg-background/50 border-border/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                className="bg-background/50 border-border/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                Senha
              </Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                className="bg-background/50 border-border/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select value={registerRole} onValueChange={(v) => setRegisterRole(v as 'admin' | 'user')}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">👨‍🎓 Aluno</SelectItem>
                  <SelectItem value="admin">🛡️ Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="relative">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDirectRegister} 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
