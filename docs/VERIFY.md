# Verify a local build

1. From the repository root on Windows, build the installer:

   ```sh
   pnpm dist:desktop:win
   ```

2. Find the generated installer in the repository's `release/` directory.
3. Run the installer and complete setup.
4. Launch Lief.code from the installed app.
5. Check that the app icon appears correctly and open **About** to confirm the app details load.
