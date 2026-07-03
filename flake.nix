{
  description = "Node.js TypeScript + PDF Tools Development Environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, utils }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        pythonEnv = pkgs.python3.withPackages (ps: with ps; [
          pymupdf      # PDF image extraction + text parsing
          pillow       # Image processing
          pandas       # CSV manipulation
        ]);
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_24
            pnpm_10
            pythonEnv
            poppler-utils   # pdfimages, pdfinfo, pdftotext CLI tools
          ];

          shellHook = ''
            echo "zheal dev environment ready!"
            echo "  node:    $(node --version)"
            echo "  pnpm:    $(pnpm --version)"
            echo "  python:  $(python3 --version)"
            echo "  pdfinfo: $(pdfinfo --version 2>&1 | head -1)"
          '';
        };
      }
    );
}
