import React from 'react';
import {makeStyles} from '@material-ui/core/styles';
import AppBar from "@material-ui/core/AppBar";
import Box from "@material-ui/core/Box";
import Button from '@material-ui/core/Button';
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Card from "@material-ui/core/Card";
import Chip from "@material-ui/core/Chip";
import Container from "@material-ui/core/Container";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Grid from "@material-ui/core/Grid";
import Switch from "@material-ui/core/Switch";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import {collapseDegenerateDirectories, descendingByKey, makeDirNode, makeProjectDirNodeTree, reduceCodeStatListByName, SEPARATOR, TESTING,} from "./analysis";
import LanguagesChips, {getDefaultExclusions} from "./LanguagesChips";
import ProjectLoader from "./ProjectLoader";
import Renderer from "./Renderer";
import SignIn from "./SignIn";
import Link from "@material-ui/core/Link";
import {Accordion, AccordionDetails, AccordionSummary} from "@material-ui/core";

// settings
const DEFAULT_GUEST_NAME = 'Guest';
const DEFAULT_PROJECT_NAME = 'Composite Project';

// App styled looks
const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  appBar: {
    // position: 'relative',
    background: 'white',
  },
  toolbar: {
    flexWrap: 'wrap',
  },
  toolbarTitle: {
    flexGrow: 1,
  },
  toolbarLink: {
    margin: theme.spacing(1, 0.5),
  },
  heroContent: {
    padding: theme.spacing(8, 0, 2),
  },
  sectionClass: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(3),
  },
  projectCard: {
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.primary.contrastText,
  },
  descLabel: {
    // padding: theme.spacing(0.5, 0),
  },
  folderChip: {
    margin: theme.spacing(0.5),
  },
  footer: {
    marginTop: 'auto',
    borderTop: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(4, 0),
    backgroundColor: theme.palette.common.white,
  },
}));

// other constants
const GITHUB_URL = 'https://github.com/enricoros/code-xray';
const LEGAL = ['Terms: do not use this website. This website does not promise anything and declines all responsibilities.',
  'Privacy Policy: This application runs on your browser, nothing is collected from the server side. If you provide ' +
  'data, the data is not uploaded.'];

function Hero(props) {
  const classes = useStyles();
  return <Container maxWidth="md" component="main" className={classes.heroContent}>
    <Typography variant="h2" component="h1" align="center" color="textPrimary" gutterBottom>
      {props.title}
    </Typography>
    <Typography variant="h5" align="center" color="textSecondary" component="p">
      {props.description}
    </Typography>
  </Container>
}


function Section(props) {
  return <Container maxWidth="lg" component="main" className={props.className}> {
    props.title && <Typography variant="h5" component="h2" align={props.align || "inherit"} gutterBottom>
      {props.title}</Typography>}
    {props.children}
  </Container>
}

/**
 * The objective of this class is to create a single project out of multiple ones (if multiple are supplied)
 * and to perform all project-dependent computation, so that it won't need to be redone every time the state
 * changes in the children.
 */
function MultiProjectFilterClosure(props) {
  const {projects} = props;

  // const mpnFileStatList = NOTE: there's no meaning to fuse the file list now
  const mpnLangStatList = reduceCodeStatListByName(projects.map(p => p.unfiltered.langStatList).flat())
    .sort(descendingByKey('code'));

  return <MultiProjectFilter langStatList={mpnLangStatList} projects={projects}/>;
}


function MultiProjectFilter(props) {
  const {langStatList, projects} = props;
  const classes = useStyles();

  // state from this

  const [noLanguages, setNoLanguages] = React.useState(getDefaultExclusions(langStatList));
  const [noFolderPrefix, setNoFolderPrefix] = React.useState([]);
  const [semCollapse, setSemCollapse] = React.useState(true);

  const excludeFolder = (path) => setNoFolderPrefix((state) => state.concat(path));
  const includeFolder = (path) => setNoFolderPrefix((state) => state.filter(n => n !== path));

  return (
    <React.Fragment>

      {/* Show Analysis on loaded content */}
      {/*<Section title="Analysis" className={classes.sectionClass}>*/}
      {/*  {(projects.length > 1) && <Typography>For {projects.length} projects</Typography>}*/}
      {/* .... */}
      {/*</Section>*/}

      {/* Section 3 filter */}
      <Section title="Cleanup content" className={classes.sectionClass}>
        {/* Remove Files by Language */}
        <Accordion defaultExpanded={true}>
          <AccordionSummary expandIcon={<ExpandMoreIcon/>} href="">
            {/*Raise the signal, drop the noise.*/}
            <Typography>Filter Languages{(noLanguages.length > 0) && ' (' + noLanguages.length + ')'}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <LanguagesChips langStatList={langStatList} noLanguages={noLanguages} onChange={setNoLanguages}/>
          </AccordionDetails>
        </Accordion>

        {/* Remove Files by Folder */}
        <Accordion defaultExpanded={true}>
          <AccordionSummary expandIcon={<ExpandMoreIcon/>} href="">
            <Typography>Filter Folders{(noFolderPrefix.length > 0) && ' (' + noFolderPrefix.length + ')'}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container>
              <Grid item xs={12} sm={4} md={2}>
                <FormLabel component="div" className={classes.descLabel}>Removed folders</FormLabel>
              </Grid>
              <Grid item xs={12} sm={8} md={10}>
                {(noFolderPrefix.length < 1) && <Typography>Click on a folder on the XRay to remove it.</Typography>}
                {noFolderPrefix.map((path, idx) =>
                  <Chip variant="outlined" label={path} onDelete={() => includeFolder(path)}
                        key={'no-folder-' + idx} component="div" className={classes.folderChip}/>)}
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <FormLabel component="div" className={classes.descLabel}>Lossless operations</FormLabel>
              </Grid>
              <Grid item xs={12} sm={8} md={10}>
                <FormControlLabel label="Collapse degenerate folder structures" control={
                  <Switch checked={semCollapse} onChange={(e, state) => setSemCollapse(state)} color="primary"/>}/>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Section>

      {/* Section 5 render */}
      <React.Fragment>
        <Section title="Source code explosion" className={classes.sectionClass}>
          <Card>
            <CardContent>
              <RenderingClosure noLanguages={noLanguages} noFolderPrefix={noFolderPrefix}
                                collapseDegenerate={semCollapse} projects={projects} doRemovePath={excludeFolder}/>
            </CardContent>
          </Card>
        </Section>
      </React.Fragment>

    </React.Fragment>
  )
}


function RenderingClosure(props) {
  const {noLanguages, noFolderPrefix, collapseDegenerate, projects, doRemovePath} = props;
  const onClicked = dirNode => doRemovePath(dirNode.path);

  // multi project tree
  let fusedTree = makeDirNode(DEFAULT_PROJECT_NAME);
  fusedTree.is_multi_project = true; // FIXME: HACK

  // create per-project trees, executing cleanups
  projects.forEach(p => {
    // lossy cleanup 1: remove entire folders from the export (for example if you didn't care about /scripts/..)
    // lossy cleanup 2: remove files written in unwanted languages, to improve the SNR
    const filteredFileStatList = p.unfiltered.fileStatList.filter(fs => {
      const projectDir = p.name + SEPARATOR + fs.dir;
      const hasFolderPrefix = noFolderPrefix.find(folder => projectDir.startsWith(folder));
      const hasLanguage = noLanguages.find(languageName => fs.codeStatList.map(cs => cs.name).includes(languageName));
      return !hasFolderPrefix && !hasLanguage;
    });

    // make the project tree
    const filteredDirStatTree = makeProjectDirNodeTree(filteredFileStatList, p.name);

    // loss-less cleanup 3: collapse degenerate a-b-c- .. directories into single 'a/b/c/' nodes
    if (collapseDegenerate)
      collapseDegenerateDirectories(filteredDirStatTree);

    // if single project, let this tree be the root, otherwise append to children
    if (projects.length === 1)
      fusedTree = filteredDirStatTree;
    else
      fusedTree.children.push(filteredDirStatTree);
  });

  return <Renderer projectTree={fusedTree} onClicked={onClicked}/>
}


function App() {
  const classes = useStyles();
  const [experiment, setExperiment] = React.useState(false);
  const [userName, setUserName] = React.useState(DEFAULT_GUEST_NAME);
  const [projects, setProjects] = React.useState([]);

  function addProject(project) {
    setProjects((projects) => projects.concat(project));
  }

  function removeProject(index) {
    const remaining = [].concat(projects);
    remaining.splice(index, 1);
    setProjects(remaining);
  }

  const hasProjects = projects.length > 0;
  const multiProject = projects.length > 1;
  const autoLoadExample = window.location.pathname.includes('examples/libra') && !hasProjects ? 0 : undefined;

  // ask for user name if not set
  if (!userName)
    return <SignIn onChange={setUserName}/>;

  const displayLegal = idx => e => {
    e.preventDefault();
    alert(LEGAL[idx]);
    console.log(LEGAL[idx]);
  };

  return (
    <Box className={classes.root}>

      {/* Top-level Navigation Bar */}
      <AppBar position="sticky" color="default" className={classes.appBar} elevation={3}>
        <Container maxWidth="lg">
          <Toolbar className={classes.toolbar}>
            <Typography variant="h5" color="secondary" noWrap className={classes.toolbarTitle}>
              Source Exploder
            </Typography>
            {TESTING && <FormControlLabel control={
              <Switch checked={experiment} onChange={(e, state) => setExperiment(state)} color="primary"/>
            } label="Experiments"/>}
            <Button href={GITHUB_URL + '/issues/new'} size="small"
                    className={classes.toolbarLink}>Request a Feature</Button>
            <Button href={GITHUB_URL} size="small"
                    className={classes.toolbarLink}>GitHub</Button>
            {/*<Link variant="button" color="textPrimary" href="" className={classes.toolbarLink}*/}
            {/*      component="a">{userName}</Link>*/}
            <Button href="" color="primary" size="small" className={classes.toolbarLink}
                    onClick={() => setUserName(undefined)}>Logout</Button>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Welcome Message */}
      <Hero title="Code XRay" description="Graphical representation of source code projects."/>

      {/* Projects holder and loader*/}
      <Section title={multiProject ? "Composite Project" : (hasProjects ? "Active Project" : undefined)}
               className={classes.sectionClass} align="center">
        <Grid container spacing={2} alignItems="center" justifyContent="center">
          {projects.map((p, idx) =>
            <Grid item xs={12} sm={6} md={4} key={"project-" + idx}>
              <Card raised className={classes.projectCard}>
                <CardContent>
                  <Typography variant="h6" component="h4">{p.name}</Typography>
                  <Typography>
                    <b>{p.unfiltered.fileStatList.length.toLocaleString()} files</b>,
                    written in {p.unfiltered.langStatList.length} languages
                  </Typography>
                  <Typography>
                    <b>{p.unfiltered.codeStatSum.code.toLocaleString()} lines of code</b>
                    {(p.unfiltered.langStatList.length > 0) && (', ' +
                      ~~(100 * p.unfiltered.langStatList[0].code / p.unfiltered.codeStatSum.code) +
                      '% in ' + p.unfiltered.langStatList[0].name)}
                  </Typography>
                  {experiment &&
                    <React.Fragment>
                      <Typography>Lang: LOCs, files - density</Typography>
                      {p.unfiltered.langStatList.map((cs, idx) =>
                        <Box key={"lang-" + idx}>
                          - {cs.name}: {cs.code.toLocaleString()}, {cs.files.toLocaleString()} ({~~(cs.code / cs.files)})
                        </Box>)}
                    </React.Fragment>}
                </CardContent>
                <CardActions>
                  <Button onClick={() => removeProject(idx)} href="#" className={classes.projectCard}>
                    {multiProject ? "Remove This" : "Close Project"}</Button>
                </CardActions>
              </Card>
            </Grid>)}
          <ProjectLoader hasProjects={hasProjects} autoLoadExample={autoLoadExample} onProjectLoaded={addProject}/>
        </Grid>
      </Section>

      {/* Projects */}
      {hasProjects && <MultiProjectFilterClosure projects={projects}/>}

      {/* Padding element so that the footer doesn't come too close*/}
      <Box style={{marginTop: 8 * 4}}/>

      {/* Footer */}
      <Box className={classes.footer} component="footer">
        <Container maxWidth="sm">
          <Typography variant="body1" color="textPrimary" align="center">
            Built with love by <Link color="inherit" href="https://www.enricoros.com/" component="a">Enrico Ros</Link>.
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center">
            {' '}<Link color="inherit" component="a" href={GITHUB_URL}>Source code</Link>
            {' and '}<Link color="inherit" component="a" href={GITHUB_URL + '/issues'}>issues tracking</Link>
            {' on '}<Link color="inherit" component="a" href={GITHUB_URL}>GitHub</Link>.
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center">
            Copyright 2019. <Link component="a" color="inherit" href="" onClick={displayLegal(0)}>Terms</Link>
            {' and '}<Link component="a" color="inherit" href="" onClick={displayLegal(1)}>Privacy</Link> policy.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

export default App;
