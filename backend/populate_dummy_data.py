import os
import sys
import io
import random
from datetime import date, timedelta

# Fix Windows console encoding if needed
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cms_backend.settings')

import django
django.setup()

from django.core.files.base import ContentFile
from content.models import GalleryItem, Startup, NewsUpdate, TeamMember

try:
    from PIL import Image, ImageDraw
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def generate_image_file(name_prefix="dummy", color=(210, 105, 30)):
    """Generate a clean colored placeholder PNG image."""
    if HAS_PIL:
        width, height = 400, 300
        image = Image.new('RGB', (width, height), color=color)
        draw = ImageDraw.Draw(image)
        # Draw a decorative rectangle / border
        draw.rectangle([10, 10, width - 10, height - 10], outline=(255, 255, 255), width=3)
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        return ContentFile(buffer.getvalue(), name=f"{name_prefix}_{random.randint(1000, 9999)}.png")
    else:
        # Minimal 1x1 transparent PNG fallback bytes
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82'
        return ContentFile(png_bytes, name=f"{name_prefix}_{random.randint(1000, 9999)}.png")

# Curated palettes matching Claude terracotta / warm earth tones
PALETTES = [
    (195, 95, 45),   # Terracotta Orange
    (45, 95, 140),   # Deep Cyan / Blue
    (60, 120, 85),   # Forest Green
    (130, 70, 140),  # Royal Purple
    (180, 140, 50),  # Ochre Gold
    (160, 60, 60),   # Crimson Rust
    (70, 80, 95),    # Slate Gray
    (40, 130, 120),  # Teal
]

def populate_gallery():
    print("Populating Gallery (20 items)...")
    gallery_subtexts = [
        "Inauguration of the Next-Gen AI & Robotics Incubation Wing",
        "National Hackathon 2026: Over 500 Student Innovators in Action",
        "Keynote Address on DeepTech Scaling & Venture Ecosystems",
        "Hands-on Workshop on Embedded Edge Computing and IoT",
        "Annual Demo Day Showcase with Global Venture Partners",
        "Student Entrepreneurs Pitching to Angel Investor Panel",
        "Hardware Prototyping Laboratory & 3D Fabrication Session",
        "Signing of International Research Partnership MoU",
        "Clean Energy & Sustainability Hackathon Award Ceremony",
        "Women in Tech Leadership Summit at AIC Incubation Hub",
        "Deep Learning Masterclass: From Models to Production",
        "Quantum Computing & Cybersecurity Research Symposium",
        "Grand Finale: Smart India Innovation Challenge 2026",
        "Mentorship Circle: Founders Roundtable with Seed VCs",
        "BioTech & Healthcare Incubation Cohort Orientation",
        "Autonomous Drones & Aerial Robotics Flight Showcase",
        "AIC Campus Tour for International Delegation",
        "Product Design Sprint: UI/UX for Enterprise B2B Solutions",
        "Alumni Startup Founders Reunion & Networking Mixer",
        "Excellence in Innovation Trophy Presentation Ceremony",
    ]

    for i, subtext in enumerate(gallery_subtexts, 1):
        color = PALETTES[i % len(PALETTES)]
        img_file = generate_image_file(f"gallery_{i}", color)
        item = GalleryItem.objects.create(
            subtext=subtext,
            image=img_file
        )
        print(f"  + Created GalleryItem #{item.id}: {item.subtext[:40]}...")

def populate_startups():
    print("\nPopulating Startups (20 items)...")
    startups_data = [
        ("NeuroSync AI", "Real-time brain-computer interface telemetry and cognitive analytics for neuro-rehabilitation.", "https://neurosync.ai"),
        ("QuantumVolt", "Next-generation solid-state lithium-metal battery management and fast-charging architecture.", "https://quantumvolt.tech"),
        ("AeroDynamics Labs", "Autonomous drone fleet logistics and BVLOS aerial monitoring software for agriculture.", "https://aerodynamicslabs.io"),
        ("Solaris Bio", "Microbiome genomics and AI-driven precision therapeutics platform for metabolic health.", "https://solarisbio.com"),
        ("CogniSphere", "Enterprise multilingual generative AI agents for regulatory compliance and finance.", "https://cognisphere.dev"),
        ("CyberShield Mesh", "Zero-trust decentralized endpoint identity and post-quantum cryptographic mesh.", "https://cybershield.network"),
        ("AquaPura Robotics", "Autonomous underwater robotic drones for subsea pipeline and ocean microplastic filtration.", "https://aquapurarobotics.com"),
        ("TerraGrid Energy", "Decentralized peer-to-peer renewable microgrid trading and predictive load balancing.", "https://terragrid.energy"),
        ("VoxelHealth", "High-resolution 3D holographic medical imaging diagnostics and surgical planning tools.", "https://voxelhealth.med"),
        ("HyperFlux Compute", "Distributed GPU serverless orchestration cluster for large language model inference.", "https://hyperflux.cloud"),
        ("NanoSens Tech", "Ultra-low power printed nanosensors for real-time food freshness and supply chain tracking.", "https://nanosens.tech"),
        ("OptiRoute Freight", "Predictive AI freight load optimization and zero-emission multimodal route scheduling.", "https://optiroutefreight.io"),
        ("SynthoMaterials", "Machine-learning accelerated discovery of sustainable biodegradable polymers.", "https://synthomaterials.com"),
        ("AgriSense Vision", "Edge-AI multispectral drone cameras for early crop pest detection and soil hydrology.", "https://agrisensevision.org"),
        ("PulseCare Telehealth", "Remote ICU patient vitals monitoring with automated clinical anomaly alerts.", "https://pulsecare.health"),
        ("OrbitLink Space", "Modular CubeSat laser communication transceivers for low-earth orbit mega-constellations.", "https://orbitlinkspace.com"),
        ("DeepCode Security", "Automated static code security scanning and autonomous vulnerability patch generation.", "https://deepcode.security"),
        ("BioPrint Systems", "3D microfluidic bioprinting of vascularized tissue scaffolds for drug testing.", "https://bioprintsystems.co"),
        ("EcoCool Thermal", "Passive evaporative cooling metamaterials for zero-electricity building climate control.", "https://ecocoolthermal.com"),
        ("FinMatrix Quant", "Algorithmic high-frequency market making and real-time liquidity risk modeling.", "https://finmatrixquant.ai"),
    ]

    for i, (name, desc, url) in enumerate(startups_data, 1):
        color = PALETTES[(i + 2) % len(PALETTES)]
        img_file = generate_image_file(f"startup_{i}", color)
        startup = Startup.objects.create(
            name=name,
            description=desc,
            website_url=url,
            logo_or_image=img_file
        )
        print(f"  + Created Startup #{startup.id}: {startup.name} ({startup.website_url})")

def populate_news():
    print("\nPopulating News Updates (20 items)...")
    news_data = [
        (
            "AIC IIITK Secures $2.5M Seed Acceleration Fund for DeepTech Startups",
            "A landmark grant aimed at funding 15 breakthrough university spinouts over the next 18 months.",
            "The AIC incubation facility announced a landmark $2.5M venture seed fund backed by industry consortiums and state innovation councils.\n\nThis funding will directly provide early-stage capital, lab infrastructure, high-performance compute access, and specialized legal compliance mentorship for university founders building in artificial intelligence, robotics, and clean energy.\n\nSelected startups in the cohort will receive non-dilutive prototype grants alongside direct investor demo days in Singapore, Bangalore, and San Francisco."
        ),
        (
            "National Innovation Challenge 2026 Launches with 100+ University Teams",
            "Registrations open for the flagship 72-hour student hackathon focusing on Climate Tech and AI.",
            "Over 1,200 participants from leading technological institutes across the country have registered for the 2026 National Innovation Challenge hosted at our incubation hub.\n\nTeams will build prototype solutions in four core tracks: Distributed Clean Energy, Assistive HealthTech, Next-Gen Agro-Robotics, and Decentralized Identity.\n\nThe top three teams will gain direct entry into the 6-month AIC Incubation Acceleration Track with full prototyping lab access."
        ),
        (
            "Quantum Computing Research Lab Inaugurated in Collaboration with Global Tech Leaders",
            "State-of-the-art superconducting and photonics testbeds now accessible to student founders.",
            "In an official ribbon-cutting ceremony attended by government dignitaries and industry pioneers, the AIC Quantum Computing Testbed was officially commissioned.\n\nThe facility features dedicated cryogenic simulators, high-qubit cloud emulator access, and specialized software toolchains to enable founders to design novel algorithms in cryptography, portfolio optimization, and quantum molecular modeling."
        ),
        (
            "Startup Cohort 2025 Reports Over 300% Growth in Annual Seed Funding",
            "Incubated portfolio companies achieve cumulative valuation exceeding $45 million.",
            "AIC's annual portfolio report highlighted unprecedented momentum across all four focus sectors. Graduates of the 2025 cohort closed institutional seed rounds from top venture capital firms.\n\nFounders credited the rigorous mentorship clinics, patent filing support, and direct market validation access provided by the incubation center as critical catalysts in accelerating their go-to-market speed."
        ),
        (
            "Strategic MoU Signed with Global Venture Network for Cross-Border Acceleration",
            "Founders gain streamlined access to international investor networks and soft-landing programs.",
            "AIC has officially entered into a bilateral innovation pact with Global Venture Networks. The agreement allows incubated startups to leverage soft-landing workspaces, regulatory advisory, and pilot customer introductions across Europe, North America, and Southeast Asia."
        ),
        (
            "AI in Healthcare Hackathon Concludes with Five Clinical Pilot Agreements",
            "Medical AI solutions developed during the 48-hour sprint to begin hospital trials.",
            "Five student-led diagnostic AI projects developed during last weekend's MedTech sprint were signed for pilot testing at leading regional teaching hospitals.\n\nThe solutions include automated diabetic retinopathy screening on edge devices, AI-powered triage voice bots in regional languages, and computer-vision assisted surgical tool tracking."
        ),
        (
            "CleanTech Incubator Deploys First Micro-Hydro & Solar Smart Grid on Campus",
            "Live sandbox provides real-world telemetry for renewable energy startups.",
            "A fully instrumented smart microgrid combining solar arrays, kinetic flow hydro-turbines, and battery storage went live today. The facility operates as an open-access sandbox for power management and smart metering startups."
        ),
        (
            "Call for Applications: AIC Fall 2026 Acceleration Cohort Now Open",
            "Early-stage tech founders can apply for equity-free grants and 1-on-1 VC mentorship.",
            "Applications are now open for the AIC Fall 2026 cohort. We invite ambitious founders building deep technical products to apply. Benefits include co-working space, cloud credits worth over $100k, prototyping facilities, and weekly strategy sessions with industry leaders."
        ),
        (
            "Autonomous Mobility Lab Debuts Level-4 Campus Shuttle Prototype",
            "Electric autonomous research vehicle successfully navigates mapped campus routes.",
            "Student engineers and incubated startup researchers unveiled a Level-4 autonomous campus transit shuttle. Powered by solid-state LiDAR and onboard neural compute, the vehicle completed its first 100 incident-free test loops."
        ),
        (
            "Patents Milestone: 35 Intellectual Property Disclosures Filed in 2026",
            "AIC patent facilitation cell supports record number of university research filings.",
            "The Intellectual Property Support Cell celebrated a milestone of 35 filed patent disclosures spanning robotics mechanisms, novel biofuel synthesis methods, and cryptographic zero-knowledge protocols."
        ),
        (
            "International Mentorship Summit Brings 40+ Silicon Valley Leaders to Campus",
            "Intensive 3-day masterclasses on product-market fit, global scaling, and VC fundraising.",
            "Global tech executives, angel investors, and seasoned venture partners converged at AIC for the Annual International Mentorship Summit. Over 80 one-on-one pitch clinics and code review sessions were conducted."
        ),
        (
            "Women Entrepreneurship Accelerator Welcomes 12 High-Impact Startups",
            "Dedicated mentorship initiative aimed at empowering female-founded tech companies.",
            "The AIC Women In Tech Accelerator welcomed its newest cohort of 12 ventures spanning FinTech, HealthTech, and EdTech, providing bespoke leadership coaching and direct investor introductions."
        ),
        (
            "New High-Performance GPU Cluster Live for Student AI Research",
            "Access to 64 enterprise-grade GPUs now open for training large vision and language models.",
            "The compute cluster offers ultra-fast interconnects and high-throughput storage, drastically reducing training times for computer vision and multimodal reasoning models developed by incubator members."
        ),
        (
            "Smart Agriculture Drone Initiative Awarded National Sustainability Grant",
            "Precision spraying and multispectral soil analysis drone program receives national recognition.",
            "Our precision agriculture team received a major grant to expand their drone testing network across 50 regional farming cooperatives, helping optimize water and fertilizer usage."
        ),
        (
            "BioDesign Fabrication Studio Expands with 3D Cellular Printers",
            "Advanced bioprinting equipment enhances regenerative tissue engineering capabilities.",
            "The newly installed bioprinters enable incubated biomedical startups to fabricate complex hydrogel scaffolds for tissue regeneration studies and cellular assay testing."
        ),
        (
            "EdTech Startup 'CodeMatrix' Acquired in Multi-Million Dollar Deal",
            "AIC incubated company achieves successful exit after 3 years of hyper-growth.",
            "CodeMatrix, an interactive coding pedagogy platform built at AIC, announced its successful acquisition. The founding team will continue to lead product development as part of the acquiring global education consortium."
        ),
        (
            "Cybersecurity Sandbox Unveils Threat Simulation Arena for FinTech Startups",
            "Isolated cyber-range enables realistic penetration testing and defense drills.",
            "The new sandbox environment mimics complex enterprise networks, allowing founders to stress-test their security software against modern exploit vectors in real-time."
        ),
        (
            "Robotics Team Wins First Place at Asian Autonomous Navigation Derby",
            "University rover team outcompetes 45 international university teams in outdoor navigation.",
            "Demonstrating superior SLAM algorithms and robust chassis engineering, the student robotics team took top honors at the international robotics trials."
        ),
        (
            "Annual Founder Demo Day Scheduled for Next Month with 50+ Registered VCs",
            "20 graduating startups will pitch live on stage to prominent seed and angel investors.",
            "Mark your calendars for AIC Demo Day 2026. The marquee event will feature live product demonstrations, panel discussions on future tech frontiers, and investor networking lounges."
        ),
        (
            "AIC Annual Impact Report 2026: 150+ Startups Supported and 800+ Jobs Created",
            "A comprehensive overview of our incubation ecosystem's economic and technological impact.",
            "The 2026 Impact Report highlights significant strides in technology commercialization, job creation, and student entrepreneurship across our regional and national innovation network."
        ),
    ]

    for i, (title, subtitle, content) in enumerate(news_data, 1):
        color = PALETTES[(i + 4) % len(PALETTES)]
        img_file = generate_image_file(f"news_{i}", color)
        news_item = NewsUpdate.objects.create(
            title=title,
            subtitle=subtitle,
            content=content,
            thumbnail=img_file
        )
        print(f"  + Created NewsUpdate #{news_item.id}: {news_item.title[:45]}...")

def populate_team():
    print("\nPopulating Team Members (20 items)...")
    team_data = [
        ("Dr. Arvind Raman", "Chief Executive Officer & Incubation Director", "team", "Over 20 years of experience leading technology commercialization, startup incubation, and university-industry research partnerships."),
        ("Prof. Sarah Jenkins", "International Mentor - DeepTech & Robotics", "mentor", "Former robotics faculty at MIT and venture advisor to autonomous vehicle startups across North America and Europe."),
        ("Dr. Rajeshwar Rao", "Chairman - Board of Governors", "governor", "Distinguished academician and former director of national research institutes, guiding strategic governance and expansion policies."),
        ("Elena Rostova", "International Mentor - AI & Machine Learning", "mentor", "Lead AI research scientist in Zurich, mentoring founders on large language models and neural architecture search."),
        ("Vikramaditya Sen", "Head of Venture Relations & Seed Fund", "team", "Specializes in early-stage venture structuring, angel syndicate syndication, and cross-border tech investments."),
        ("Dr. Meera Nambiar", "Director of BioTech & Health Innovation", "governor", "Leading biotechnology researcher and patent strategist with multiple commercialized diagnostics devices."),
        ("Marcus Vance", "International Mentor - Hardware & IoT", "mentor", "Silicon Valley veteran with 15+ years of experience in custom ASIC design, hardware prototyping, and manufacturing logistics."),
        ("Ananya Deshmukh", "Operations Lead & Community Manager", "team", "Manages day-to-day cohort programming, hackathons, demo days, and incubator facilities operations."),
        ("Kavitha Sundaram", "Legal & Intellectual Property Counsel", "team", "Specialist in patent disclosures, tech licensing, founder agreements, and international trademark governance."),
        ("Prof. David Chen", "International Mentor - Quantum Systems", "mentor", "Quantum computing researcher and advisor to venture studios focusing on post-quantum cryptography algorithms."),
        ("Siddharth Roy", "Technical Lead - Prototyping Labs", "team", "Oversees 3D fabrication studios, CNC machining centers, and PCB surface-mount electronic prototyping labs."),
        ("Dr. Farhan Qureshi", "Board of Governors - CleanTech Lead", "governor", "Pioneer in solar photovoltaics and grid-scale storage, advising governmental energy policy committees."),
        ("Claire Dubois", "International Mentor - B2B SaaS & Growth", "mentor", "Paris-based growth strategist who has scaled multiple enterprise SaaS ventures from seed to Series B."),
        ("Pooja Singhania", "Startup Success & Cohort Manager", "team", "Guides founders through customer discovery sprints, grant proposals, and product-market fit milestones."),
        ("Rohan Kulkarni", "Lead AI & Cloud Infrastructure Engineer", "team", "Manages the high-performance GPU cluster, containerized environments, and cloud infrastructure for incubated teams."),
        ("Dr. Beatrice Taylor", "International Mentor - MedTech Regulation", "mentor", "Global regulatory consultant guiding digital health and medical device founders through FDA and CE certifications."),
        ("Suresh Balakrishnan", "Board of Governors - Industry Liaison", "governor", "Senior corporate executive bridging industry CSR grants and corporate venture capital with university research spinouts."),
        ("Tarun Mittal", "Finance & Compliance Officer", "team", "Manages financial audits, government grant disbursements, and regulatory tax compliance for incubatees."),
        ("Dr. Linda Zhao", "International Mentor - Sustainable Materials", "mentor", "Materials science researcher working with next-generation biodegradable polymers and green chemical processes."),
        ("Prof. Harish Nair", "Board of Governors - Academic Advisory", "governor", "Senior dean of engineering, driving multidisciplinary curriculum integration with hands-on entrepreneurship."),
    ]

    for i, (name, role, category, bio) in enumerate(team_data, 1):
        color = PALETTES[(i + 1) % len(PALETTES)]
        img_file = generate_image_file(f"team_{i}", color)
        member = TeamMember.objects.create(
            name=name,
            role=role,
            category=category,
            bio=bio,
            photo=img_file
        )
        print(f"  + Created TeamMember #{member.id}: {member.name} ({member.category})")

def main():
    print("==============================================")
    print("🚀 Populating Django CMS Database with Dummy Data (20 items per API)")
    print("==============================================")
    
    populate_gallery()
    populate_startups()
    populate_news()
    populate_team()
    
    print("\n==============================================")
    print("✅ All 80 records (20 for each API) populated successfully!")
    print(f"Gallery Items: {GalleryItem.objects.count()}")
    print(f"Startups:      {Startup.objects.count()}")
    print(f"News Updates:  {NewsUpdate.objects.count()}")
    print(f"Team Members:  {TeamMember.objects.count()}")
    print("==============================================")

if __name__ == '__main__':
    main()
