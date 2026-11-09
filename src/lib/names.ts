/**
 * Word lists used by the text anonymizer (src/lib/findNames.ts) alongside the language model.
 * The model (compromise) already knows many English first and last names; these lists add what it
 * misses in a school in the UAE, and the words that look like names but are not.
 */

/** Common first names the language model does not always recognise (Arabic, South Asian, African, East Asian…). */
export const FIRST_NAMES = new Set(
  `
abdulla abdullah abdulrahman abdulaziz abdelrahman adel adnan ahmad ahmed aisha aysha ayesha alia aliya alya amal amani
amina ameena amna amir ammar anas anwar arwa asma asmaa ayman ayah aya bader badr bashir basma bilal bushra dana dalia
dina eman iman faisal fahad fahd faris fares farah fatima fatma fatema ghada ghalia haya hala hamad hamdan hamza hamda
hamid hana hanan haneen hasan hassan hessa hind hiba huda hussain hussein ibrahim ismail jaber jamal jamila jana jasim
jassim joud jude jumana kareem karim khalid khaled khalifa khawla latifa layla laila leen lina lubna lujain maha mahmoud
majid malak manal mansour mariam maryam marwan mayar maitha mazen meera mira mohammed mohamed mohammad muhammad mohamad
mona mouza muna mustafa nada nadia naif nasser nawal noor nour nora noura nouf obaid omar omran osama rafeef raghad rahaf
rakan rana rania rashed rashid rasha razan reem rehab riyad roudha rouda ruqayya saad saeed saif salem salim salma
salama saleh samah sami samir sana sara sarah saud shaikha sheikha shamma shahd shams sultan suhail sumaya taha talal
tamim tariq tarek thamer turki waleed walid yahya yara yasmin yasmeen yousef youssef yusuf yazan zainab zayed zaid zeina
zayna ziad
aarav aditi aditya akash amit ananya anil anjali arjun arnav aryan ayaan deepak devansh dhruv divya gaurav harsh ishaan
ishita kabir kavya krishna manish meera neha nikhil pooja prakash pranav priya rahul raj rajesh ravi riya rohan sachin
sahil sanjay saanvi shreya siddharth sneha sunil tanvi varun vihaan vikram vivek yash zara zoya fatimah hafsa imran irfan
junaid kashif nadeem rizwan sadia shahid tahir usman waqas zainab zeeshan ali hira iqra areeba mahnoor
abena adwoa akosua ama ayodele chidi chinedu chioma emeka femi folake kofi kwame kwabena nkechi obinna olu oluwaseun
tunde yaw zanele thabo sipho naledi lerato
chen hui jia jie li lei mei ming wei xin yan ying yu zhen hiroshi yuki haruto sakura minji jiwoo seoyeon hyun
`
    .split(/\s+/)
    .filter(Boolean),
);

/** Lower-case words that join the parts of a name: "Fatima bint Rashid", "Omar Al Hashimi". */
export const NAME_PARTICLES = new Set([
  'al', 'el', 'bin', 'bint', 'ibn', 'abu', 'umm', 'abd', 'abdul', 'van', 'von', 'der', 'den', 'de', 'la', 'le', 'da',
  'di', 'dos', 'del', 'du', 'mc', 'mac', 'st',
]);

/** Titles. The title itself stays in the text ("Ms PERSON-003"); the name after it is replaced. */
export const HONORIFICS = new Set([
  'mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'prof', 'professor', 'sir', 'madam', 'madame', 'dame', 'lady', 'lord',
  'sheikh', 'sheikha', 'shaikh', 'shaikha', 'ustadh', 'ustadha', 'ustaz', 'ustaza', 'coach', 'mister', 'mrs.',
]);

/** Words after which a capitalised word is almost always someone's name: "my son Hamad", "Dear Reem". */
export const CUE_WORDS = new Set([
  'son', 'daughter', 'child', 'children', 'kid', 'brother', 'sister', 'sibling', 'cousin', 'twin', 'nephew', 'niece',
  'mother', 'father', 'mum', 'mom', 'dad', 'parent', 'guardian', 'husband', 'wife', 'friend', 'classmate', 'student',
  'pupil', 'learner', 'teacher', 'colleague', 'named', 'called', 'dear', 'hi', 'hello', 'thanks', 'congratulations',
  'congrats', 'from', 'regards', 'sincerely', 'cc',
]);

/** Words at the start of a question that the model can mistake for a first name ("Will Grace come?"). */
export const LEADING_NON_NAMES = new Set([
  'will', 'may', 'can', 'did', 'does', 'do', 'is', 'are', 'was', 'were', 'shall', 'should', 'would', 'could', 'has',
  'have', 'had', 'please', 'thanks', 'dear', 'hi', 'hello', 'and', 'but', 'so', 'if', 'when', 'then', 'also',
]);

/**
 * Capitalised words in school writing that are not people: subjects, school terms, places in the UAE,
 * tools. They are never treated as names unless the user marks them.
 */
export const NOT_NAMES = new Set(
  `
english arabic math maths mathematics science sciences physics chemistry biology history geography art arts music pe
islamic quran social studies moral education drama french spanish german chinese mandarin hindi urdu computing computer
computers design technology economics business psychology sociology literature language languages reading writing
grade grades year years term terms semester trimester unit units lesson lessons week weeks class classes section
homeroom principal teacher teachers student students school schools exam exams test tests quiz quizzes assessment
assessments homework project projects report reports notes note comment comments feedback summary dear regards team
department head deputy counsellor counselor nurse coordinator sen iep ilp send map cat4 ib ap igcse sat act gpa
kg fs ks elementary primary middle high secondary upper lower campus library gym cafeteria canteen hall office
monday tuesday wednesday thursday friday saturday sunday january february march april june july august september
october november december ramadan eid national day uae emirates emirati abu dhabi dubai sharjah ajman fujairah ras
khaimah quwain ain saadiyat yas mussafah adek khda moe aisa god allah ai chatgpt gpt gemini copilot
claude google microsoft teams classroom excel word powerpoint docs sheets slides drive gmail outlook zoom canvas
seesaw toddle powerschool managebac council committee club society union government ministry university college academy institute i i'm i've i'd i'll ok okay yes no not none n/a na tbc tbd
`
    .split(/\s+/)
    .filter(Boolean),
);

