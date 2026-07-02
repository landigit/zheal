{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_22
    nodePackages.typescript
  ];

  shellHook = ''
    echo "Welcome to the TypeScript Node.js development environment!"
    node --version
    npm --version
  '';
}
