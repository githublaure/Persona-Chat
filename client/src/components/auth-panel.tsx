import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const authMutation = useMutation({
    mutationFn: async () => {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await apiRequest("POST", endpoint, { username, password });
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return res.json();
      }

      const rawBody = await res.text();
      throw new Error(
        `Réponse serveur invalide pendant ${mode === "login" ? "la connexion" : "l'inscription"}. ` +
          `Le serveur a renvoyé un format inattendu.` +
          (rawBody ? ` Détail: ${rawBody.slice(0, 120)}` : "")
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: mode === "login" ? "Connexion échouée" : "Inscription échouée",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Persona Chat</CardTitle>
          <CardDescription>
            {mode === "login" ? "Connectez-vous pour accéder à vos chats privés." : "Créez votre compte pour des chats privés."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button className="w-full" onClick={() => authMutation.mutate()} disabled={authMutation.isPending}>
            {mode === "login" ? "Se connecter" : "Créer un compte"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setMode(mode === "login" ? "register" : "login") }>
            {mode === "login" ? "Pas de compte ? Inscription" : "Déjà un compte ? Connexion"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
