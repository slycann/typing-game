import Capacitor
import UIKit

/// Lets grown-ups save a backup from the Parent Zone. A download link in the web view has nowhere
/// to put the file, so the game calls this instead (src/save/backupFile.ts): it writes the backup
/// to a temporary file and shows the system's "save a copy" dialog, which is the Files browser on
/// iPad and a save panel on a Mac.
@objc(BackupExportPlugin)
public class BackupExportPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "BackupExportPlugin"
    public let jsName = "BackupExport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
    ]

    private var pendingCall: CAPPluginCall?
    private var tempFolder: URL?

    @objc func save(_ call: CAPPluginCall) {
        guard let filename = call.getString("filename"), let contents = call.getString("contents") else {
            call.reject("The backup was missing its name or contents.")
            return
        }
        DispatchQueue.main.async {
            guard self.pendingCall == nil else {
                call.reject("A backup is already being saved.")
                return
            }
            guard let presenter = self.bridge?.viewController else {
                call.reject("There's no window to show the save dialog in.")
                return
            }
            let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
            let file = folder.appendingPathComponent((filename as NSString).lastPathComponent)
            do {
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                try contents.write(to: file, atomically: true, encoding: .utf8)
            } catch {
                try? FileManager.default.removeItem(at: folder)
                call.reject("The backup couldn't be written: \(error.localizedDescription)")
                return
            }
            self.pendingCall = call
            self.tempFolder = folder
            let picker = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
            picker.delegate = self
            presenter.present(picker, animated: true)
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        finish(saved: true)
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        finish(saved: false)
    }

    private func finish(saved: Bool) {
        pendingCall?.resolve(["saved": saved])
        pendingCall = nil
        if let folder = tempFolder { try? FileManager.default.removeItem(at: folder) }
        tempFolder = nil
    }
}

/// The game's web view, with Letterlings' own native helpers added to Capacitor's.
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BackupExportPlugin())
    }
}
