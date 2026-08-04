import { useCallback, useEffect, useState } from "react";

/**
 * Instalação do app na tela inicial.
 *
 * Android/Chrome/Edge: o navegador dispara `beforeinstallprompt`; guardamos o
 * evento e chamamos `prompt()` no clique do usuário — instala de dentro do app.
 *
 * iOS/Safari: a Apple não expõe esse evento. O único caminho é Compartilhar →
 * "Adicionar à Tela de Início", então mostramos o passo a passo guiado.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallMethod = "prompt" | "ios-manual" | "unsupported";

const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS expõe esta flag não-padrão quando roda da tela inicial
    (window.navigator as any).standalone === true
  );
};

const detectIOS = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se apresenta como Mac; o toque na tela é o que o denuncia
  const iPadDesktopUA = /Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1;
  return iOSDevice || iPadDesktopUA;
};

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [isIOS] = useState(detectIOS);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Impede o mini-infobar do Chrome para usarmos nosso próprio botão
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Alternar para modo app sem recarregar também conta como instalado
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayChange = (e: MediaQueryListEvent) => e.matches && setInstalled(true);
    mq?.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const method: InstallMethod = deferred ? "prompt" : isIOS ? "ios-manual" : "unsupported";

  /** Retorna true se o usuário aceitou instalar. Só funciona no método "prompt". */
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // O evento é de uso único: descartado independente da escolha
      setDeferred(null);
      return outcome === "accepted";
    } catch {
      setDeferred(null);
      return false;
    }
  }, [deferred]);

  return {
    /** Já está rodando instalado (tela inicial / janela própria). */
    installed,
    /** Dá para instalar agora com um clique. */
    canPrompt: !!deferred && !installed,
    /** Como este dispositivo instala. */
    method,
    isIOS,
    install,
  };
}
