import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StudentNotificationsPopover } from "@/components/notifications/StudentNotificationsPopover";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut, profile } = useAuth();

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Plano de Estudo", path: "/plano-de-estudo" },
  ];

  const isHomePage = location.pathname === "/";
  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-white/[0.02] backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-400 shadow-lg shadow-primary/25">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold leading-tight text-foreground tracking-tight">BANCÁRIO</span>
            <span className="text-xs font-semibold leading-tight bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">ÁGIL</span>
          </div>
        </div>

        {/* Desktop Navigation - Hidden on home page */}
        {!isHomePage && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(item.path) 
                    ? "bg-primary/20 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  location.pathname.startsWith("/admin") 
                    ? "bg-primary/20 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                Painel Admin
              </Link>
            )}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user && <StudentNotificationsPopover />}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden md:flex gap-2 pl-2 pr-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-fuchsia-400 text-white text-xs font-medium">
                      {profile ? getInitials(profile.nome) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium max-w-[120px] truncate text-foreground">
                    {profile?.nome?.split(' ')[0] || 'Usuário'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-black/80 backdrop-blur-xl border-white/10">
                <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                    <Link to="/admin">Painel Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive hover:bg-white/10 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">{isHomePage ? "Entrar" : "Começar Grátis"}</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button - Hidden on home page */}
        {!isHomePage && (
          <button
            className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Mobile Navigation - Hidden on home page */}
      {isMenuOpen && !isHomePage && (
        <div className="md:hidden border-t border-white/10 bg-black/80 backdrop-blur-xl">
          <nav className="container py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(item.path) 
                    ? "bg-primary/20 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Painel Admin
              </Link>
            )}
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-white/10">
              {user && (
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-muted-foreground">Notificações</span>
                  <StudentNotificationsPopover />
                </div>
              )}
              {user ? (
                <Button variant="ghost" size="sm" className="justify-start" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="justify-start" asChild>
                    <Link to="/auth">Entrar</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/auth">Começar Grátis</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
