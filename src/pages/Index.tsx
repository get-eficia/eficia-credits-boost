const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          <span className="gradient-text">Eficia</span>{" "}
          <span className="text-foreground">Credits Boost</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Projet initialisé et prêt à être développé
        </p>
        <div className="pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Prêt à démarrer
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
