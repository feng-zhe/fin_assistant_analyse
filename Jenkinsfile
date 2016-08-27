node {
    stage "prerequisites"
    git url: "/home/git/projects/fin_assistant_analyse.git"
    def nodeHome = tool 'node-lts'
    sh "${nodeHome}/bin/npm install"

    stage "build"
    sh "${nodeHome}/bin/node-gyp rebuild"

    stage "smoke-test"
    sh "${nodeHome}/bin/node analyse.js"

    stage "deploy"
    echo "TODO: this is the deploy phase, currently not needed because it is deployed locally"
}
