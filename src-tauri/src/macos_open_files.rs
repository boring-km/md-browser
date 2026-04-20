// Install an NSAppleEventManager handler for kAEOpenDocuments so that
// Finder "Open" / "Open With" file URLs are captured even when they arrive
// before Tauri's NSApplicationDelegate (managed by tao) is installed.
//
// Captured paths are pushed to a global queue; the Tauri setup hook and
// the main run loop drain this queue.

use std::sync::Mutex;

use objc2::rc::Retained;
use objc2::runtime::{AnyObject, NSObject};
use objc2::{define_class, msg_send, sel, ClassType};
use objc2_foundation::{NSAppleEventDescriptor, NSAppleEventManager};

static QUEUE: Mutex<Vec<String>> = Mutex::new(Vec::new());

const fn four_char_code(b: [u8; 4]) -> u32 {
    ((b[0] as u32) << 24) | ((b[1] as u32) << 16) | ((b[2] as u32) << 8) | (b[3] as u32)
}

const K_CORE_EVENT_CLASS: u32 = four_char_code(*b"aevt");
const K_AE_OPEN_DOCUMENTS: u32 = four_char_code(*b"odoc");
const KEY_DIRECT_OBJECT: u32 = four_char_code(*b"----");

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "MdBrowserOpenFilesHandler"]
    struct OpenFilesHandler;

    impl OpenFilesHandler {
        #[unsafe(method(handleOpenDocuments:withReplyEvent:))]
        fn handle_open_documents(
            &self,
            event: &NSAppleEventDescriptor,
            _reply: &NSAppleEventDescriptor,
        ) {
            extract_and_queue(event);
        }
    }
);

fn extract_and_queue(event: &NSAppleEventDescriptor) {
    let Some(direct) = event.paramDescriptorForKeyword(KEY_DIRECT_OBJECT) else {
        return;
    };
    let count = direct.numberOfItems();
    let mut paths: Vec<String> = Vec::new();
    for i in 1..=count {
        let Some(item) = direct.descriptorAtIndex(i) else {
            continue;
        };
        if let Some(url) = item.fileURLValue() {
            if let Some(path) = url.path() {
                paths.push(path.to_string());
            }
        }
    }
    if !paths.is_empty() {
        if let Ok(mut q) = QUEUE.lock() {
            q.extend(paths);
        }
    }
}

pub fn install_handler() {
    unsafe {
        let handler: Retained<OpenFilesHandler> =
            msg_send![OpenFilesHandler::class(), new];
        let mgr = NSAppleEventManager::sharedAppleEventManager();
        let target: *const AnyObject = &*handler as *const _ as *const AnyObject;
        let target_ref: &AnyObject = &*target;
        mgr.setEventHandler_andSelector_forEventClass_andEventID(
            target_ref,
            sel!(handleOpenDocuments:withReplyEvent:),
            K_CORE_EVENT_CLASS,
            K_AE_OPEN_DOCUMENTS,
        );
        // Handler must live for the process lifetime.
        std::mem::forget(handler);
    }
}

pub fn take_queued_paths() -> Vec<String> {
    QUEUE
        .lock()
        .map(|mut q| std::mem::take(&mut *q))
        .unwrap_or_default()
}

/// Push paths to the queue from outside (e.g. RunEvent::Opened when no window
/// has been registered yet).
pub fn push_paths(paths: Vec<String>) {
    if let Ok(mut q) = QUEUE.lock() {
        q.extend(paths);
    }
}
