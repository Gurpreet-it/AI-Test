import fs from "fs";
import path from "path";

export class ImageGenerator {
  async run(
    topic: string,
    brand: "tech" | "hcl-unica" = "tech"
  ): Promise<{ success: boolean; filePath: string }> {
    try {
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
      
      const filename = `prompts-${brand}-${timestamp}.txt`;
      const filePath = path.join(process.cwd(), "public", "images", filename);

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const prompt = this.generateLinkedInBannerPrompt(topic, brand);
      fs.writeFileSync(filePath, prompt, "utf-8");

      return {
        success: true,
        filePath: `/images/${filename}`,
      };
    } catch (err) {
      return {
        success: false,
        filePath: String(err),
      };
    }
  }

  private generateLinkedInBannerPrompt(topic: string, brand: string): string {
    if (brand === "hcl-unica") {
      return `
LinkedIn Banner Infographic (1200×627px)
Title: "${topic}"

LAYOUT (3-column: Input → Processing → Output):

LEFT COLUMN (Input):
- Title: "THE CHALLENGE"
- Icon: Target/Problem symbol
- 2-3 bullet points about the problem
- Color: Orange/Red accent

CENTER COLUMN (Processing):
- Title: "THE SOLUTION"
- Icon: Cog/Process symbol
- Flow diagram showing HCL Unica modules involved
- Key steps or transformation
- Color: Blue accent

RIGHT COLUMN (Output):
- Title: "THE RESULT"
- Icon: Success/Checkmark symbol
- 2-3 outcome bullets
- Key metrics or benefits
- Color: Green accent

BOTTOM STATS BAR:
- 3-4 key metrics about HCL Unica
- Format: Large numbers + label
- Dark background with white text

DESIGN GUIDELINES:
- Dimensions: 1200×627px
- Color scheme: HCL brand colors (Blues, Purples, Orange, Green)
- Typography: Modern sans-serif, bold headings
- Icons: Flat design, colorful
- Professional SaaS style
`;
    } else {
      return `
LinkedIn Banner Infographic (1200×627px)
Title: "${topic}"

LAYOUT (3-column: Input → Processing → Output):

LEFT COLUMN (Input):
- Title: "THE PROBLEM"
- Icon: Warning/Alert symbol
- 2-3 key pain points related to "${topic}"
- Color: Red/Orange accent

CENTER COLUMN (Processing):
- Title: "THE APPROACH"
- Icon: Automation/Process symbol
- Step-by-step process or workflow
- Key techniques or best practices for "${topic}"
- Color: Blue accent

RIGHT COLUMN (Output):
- Title: "THE BENEFIT"
- Icon: Success/Rocket symbol
- 2-3 concrete outcomes
- Performance improvements
- Color: Green accent

BOTTOM STATS BAR:
- 3-4 relevant metrics/statistics
- Format: Large bold numbers + label
- Dark background

DESIGN GUIDELINES:
- Dimensions: 1200×627px
- Color scheme: Tech blues, purples, oranges, greens
- Typography: Modern sans-serif
- Icons: Flat design, colorful
- Professional SaaS aesthetic
`;
    }
  }
}
