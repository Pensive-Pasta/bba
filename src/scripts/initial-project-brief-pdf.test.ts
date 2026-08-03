import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { downloadInitialProjectBriefPdfBlob } from "./initial-project-brief-pdf.ts";

test("uses a BBA logo matching the PDF typography blue", async () => {
  const source = await readFile(new URL("./initial-project-brief-pdf.ts", import.meta.url), "utf8");
  const logo = await readFile(
    new URL("../../public/images/BBA-Logo-Blue.svg", import.meta.url),
    "utf8",
  );
  assert.match(source, /imageToPngDataUrl\("\/images\/BBA-Logo-Blue\.svg"\)/);
  assert.doesNotMatch(source, /imageToPngDataUrl\("\/images\/BBA-Logo\.png"\)/);
  assert.match(source, /const blue: \[number, number, number\] = \[23, 143, 228\]/);
  assert.match(logo, /fill="#178FE4"/g);
  assert.doesNotMatch(logo, /#6081B4/i);
});

test("downloads an existing client PDF Blob", async (t) => {
  let appended = false;
  let clicked = false;
  let removed = false;
  let revokedUrl = "";
  let downloadedBlob: Blob | MediaSource | null = null;
  const link = {
    href: "",
    download: "",
    hidden: false,
    click: () => {
      clicked = true;
    },
    remove: () => {
      removed = true;
    },
  };

  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => link,
      body: {
        append: () => {
          appended = true;
        },
      },
    },
  });
  URL.createObjectURL = (blob) => {
    downloadedBlob = blob;
    return "blob:project-brief";
  };
  URL.revokeObjectURL = (url) => {
    revokedUrl = url;
  };
  t.after(() => {
    if (documentDescriptor) {
      Object.defineProperty(globalThis, "document", documentDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  const pdf = new Blob(["client pdf"], { type: "application/pdf" });
  downloadInitialProjectBriefPdfBlob(pdf, "BBA-initial-enquiry-alex-example.pdf");
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(link.href, "blob:project-brief");
  assert.equal(downloadedBlob, pdf);
  assert.equal(link.download, "BBA-initial-enquiry-alex-example.pdf");
  assert.equal(link.hidden, true);
  assert.equal(appended, true);
  assert.equal(clicked, true);
  assert.equal(removed, true);
  assert.equal(revokedUrl, link.href);
});
