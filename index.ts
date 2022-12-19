const fs = require("fs");
const http = require('http');
const url = require('url');

let PROJECT_TO_BUILD = process.argv[2];

if (!PROJECT_TO_BUILD) {
  console.log("No project to build");
  process.exit(1);
}

let iswaiting = false;

let build = ()=>{
  // get the file
  let file = fs.readFileSync("projects/"+PROJECT_TO_BUILD+".slides", "utf8");
  // parse the file, first split on the --- separator
  let slides = file.split("---");
  // then split on the new line
  slides = slides.map((slide)=>{
    return slide.split("\n");
  });
  console.log(slides);
  // if slides length is 1 then it's not valid lmao
  if (slides.length == 1) {
    return false;
  }
  // first slide is meta data
  let meta = slides[0];
  // remove the first slide
  slides.shift();

  // we're rendering this as html 

  // parse the meta data as object
  meta = meta.map((line)=>{
    let split = line.trim().split(":");
    return {
      key: split[0],
      value: split[1]
    }
  }).reduce((acc, curr)=>{
    acc[curr.key] = curr.value;
    return acc;
  }, {});

  // first get the template
  let template = fs.readFileSync("template.html", "utf8");
  // then replace the title
  template = template.replace("%%title%%", meta.title ?? "Untitled");
  template = template.replace("%%bgcol%%", meta.bgcol ?? "#493c68");
  template = template.replace("%%col%%", meta.col ?? "#ffffff");
  template = template.replace("%%font%%", meta.font ?? "Lato");

  // each slide is a div
  let slidehtml = "";
  slides.forEach((slide,i)=>{
    // each line is a p
    let linehtml = "";
    let isincolumn = false;
    let flags = [];
    let manualstyle = "";
    let transition = "";
    let isscript = false;
    slide.forEach((line)=>{
      if (line.trim() == "") return;
      if (line.trim() == "<script>") {
        // oh god
        isscript = true;
        linehtml += `<script>`;
        return;
      }
      if (line.trim() == "</script>") {
        // oh god
        isscript = false;
        linehtml += `</script>`;
        return;
      }
      if (isscript) {
        linehtml += line.trim();
        return;
      }
      if (line.trim() == "!!columns") {
        flags.push("columns");
        return;
      }
      if (line.trim() == "!!autoanimate") {
        flags.push("autoanimate");
        return;
      }
      if (line.trim() == "!column") {
        if (isincolumn) linehtml += `</div>`;
        linehtml += `<div class="column">`;
        isincolumn = true;
        return;
      }
      if (line.trim().startsWith("!!style")) {
        manualstyle += line.trim().replace("!!style ", "");
        return;
      }
      if (line.trim().startsWith("!!bgcol")) {
        manualstyle += `background-color: ${line.trim().replace("!!bgcol ", "")};`;
        return;
      }
      if (line.trim().startsWith("!!col")) {
        manualstyle += `color: ${line.trim().replace("!!col ", "")};`;
        return;
      }
      if (line.trim().startsWith("!!transition")) {
        transition = "transition " + line.trim().replace("!!transition ", "");
        return;
      }
      if (line.trim().startsWith("!!animblock")) {
        // spawn an empty div with the animblock class
        linehtml += `<span class="anim block"></span>`;
        return;
      }
      // check for h1
      if (line.startsWith("[](https://www.youtub")) {
        // that's a youtube video
        let src = line.replace("[](https://www.youtube.com/watch?v=", "").replace(")", "");
        linehtml += `<iframe width="560" height="315" src="https://www.youtube.com/embed/${src}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      } else
      
      {
        let isanim = false;
        if (line.startsWith("<!!")) {
          // animation
          let anim = line.replace("<!!", "").split(">")[0];
          linehtml += `<div class="anim ${anim}">`;
          isanim = true;
          line = line.replace(`<!!${anim}>`, "");
        }
        if (line.startsWith("[](")) {
          // that's an image
          let src = line.replace("[](", "").replace(")", "");
          linehtml += `<img src="${src}" />`;
        } else
        if (line.startsWith("# ")) {
          line = line.replace("# ", "");
          linehtml += `<h1>${line}</h1>`;
        } else if (line.startsWith("## ")) {
          line = line.replace("## ", "");
          linehtml += `<h2>${line}</h2>`;
        } else if (line.startsWith("### ")) {
          line = line.replace("### ", "");
          linehtml += `<h3>${line}</h3>`;
        } else if (line.startsWith("#### ")) {
          line = line.replace("#### ", "");
          linehtml += `<h4>${line}</h4>`;
        } else if (line.startsWith("##### ")) {
          line = line.replace("##### ", "");
          linehtml += `<h5>${line}</h5>`;
        } else if (line.startsWith("###### ")) {
          line = line.replace("###### ", "");
          linehtml += `<h6>${line}</h6>`;
        } else {
          linehtml += `<p>${line}</p>`;
        }
        if (isanim) linehtml += `</div>`;
      }
    });
    if (isincolumn) linehtml += `</div>`;
    slidehtml += `<div class="slide ${flags.join(" ")} ${transition}" id="${i}" style="z-index: ${i}; ${manualstyle}">${linehtml}</div>`;
  });

  // add last slide
  slidehtml += `<div class="slide last" style="z-index: ${slides.length};" id="${slides.length}"><h6>end of presentation</h6></div>`;

  // replace the slides
  template = template.replace("%%slides%%", slidehtml);

  // write out to output.html
  fs.writeFileSync("output.html", template);

}

// watch the project
fs.watch("projects/"+PROJECT_TO_BUILD+".slides", (eventType, filename) => {
  if (!iswaiting) {
    iswaiting = true;
    setTimeout(() => {
      console.log("building!!");
      iswaiting = false;
      build();
    }, 100);
  }

});