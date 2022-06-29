import React, { useContext, useEffect, useState } from "react";
import TreeItem from "./TreeItem";
import LogObjectService from "../../services/logObjectService";
import MessageObjectService from "../../services/messageObjectService";
import RiskObjectService from "../../services/riskObjectService";
import Well from "../../models/well";
import Wellbore, {
  calculateLogGroupId,
  calculateMessageGroupId,
  calculateRiskGroupId,
  calculateRigGroupId,
  calculateTrajectoryGroupId,
  calculateTubularGroupId
} from "../../models/wellbore";
import LogTypeItem from "./LogTypeItem";
import RigService from "../../services/rigService";
import TrajectoryService from "../../services/trajectoryService";
import TrajectoryItem from "./TrajectoryItem";
import { truncateAbortHandler } from "../../services/apiClient";
import WellboreContextMenu, { WellboreContextMenuProps } from "../ContextMenus/WellboreContextMenu";
import NavigationContext from "../../contexts/navigationContext";
import OperationContext from "../../contexts/operationContext";
import OperationType from "../../contexts/operationType";
import NavigationType from "../../contexts/navigationType";
import { getContextMenuPosition, preventContextMenuPropagation } from "../ContextMenus/ContextMenu";
import { calculateTrajectoryId } from "../../models/trajectory";
import { SelectWellboreAction, ToggleTreeNodeAction } from "../../contexts/navigationStateReducer";
import LogsContextMenu, { LogsContextMenuProps } from "../ContextMenus/LogsContextMenu";
import { IndexCurve } from "../Modals/LogPropertiesModal";
import TubularService from "../../services/tubularService";
import { calculateTubularId } from "../../models/tubular";
import TubularItem from "./TubularItem";
import TubularsContextMenu, { TubularsContextMenuProps } from "../ContextMenus/TubularsContextMenu";

interface WellboreItemProps {
  well: Well;
  wellbore: Wellbore;
  selected: boolean;
  nodeId: string;
}

const WellboreItem = (props: WellboreItemProps): React.ReactElement => {
  const { wellbore, well, selected, nodeId } = props;
  const { navigationState, dispatchNavigation } = useContext(NavigationContext);
  const { selectedTrajectory, selectedTubular, servers } = navigationState;
  const { dispatchOperation } = useContext(OperationContext);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const onContextMenu = (event: React.MouseEvent<HTMLLIElement>, wellbore: Wellbore) => {
    preventContextMenuPropagation(event);
    const contextMenuProps: WellboreContextMenuProps = { wellbore, servers, dispatchOperation, dispatchNavigation };
    const position = getContextMenuPosition(event);
    dispatchOperation({ type: OperationType.DisplayContextMenu, payload: { component: <WellboreContextMenu {...contextMenuProps} />, position } });
  };

  const onLogsContextMenu = (event: React.MouseEvent<HTMLLIElement>, wellbore: Wellbore) => {
    preventContextMenuPropagation(event);
    const indexCurve = IndexCurve.Depth;
    const contextMenuProps: LogsContextMenuProps = { dispatchOperation, wellbore, servers, indexCurve };
    const position = getContextMenuPosition(event);
    dispatchOperation({ type: OperationType.DisplayContextMenu, payload: { component: <LogsContextMenu {...contextMenuProps} />, position } });
  };

  const onTubularsContextMenu = (event: React.MouseEvent<HTMLLIElement>, wellbore: Wellbore) => {
    preventContextMenuPropagation(event);
    const contextMenuProps: TubularsContextMenuProps = { dispatchOperation, wellbore, servers };
    const position = getContextMenuPosition(event);
    dispatchOperation({ type: OperationType.DisplayContextMenu, payload: { component: <TubularsContextMenu {...contextMenuProps} />, position } });
  };

  useEffect(() => {
    if (!isFetchingData) {
      return;
    }
    const controller = new AbortController();

    async function getChildren() {
      const getLogs = LogObjectService.getLogs(well.uid, wellbore.uid, controller.signal);
      const getRigs = RigService.getRigs(well.uid, wellbore.uid, controller.signal);
      const getTrajectories = TrajectoryService.getTrajectories(well.uid, wellbore.uid, controller.signal);
      const getMessages = MessageObjectService.getMessages(well.uid, wellbore.uid, controller.signal);
      const getRisks = RiskObjectService.getRisks(well.uid, wellbore.uid, controller.signal);
      const getTubulars = TubularService.getTubulars(well.uid, wellbore.uid, controller.signal);
      const [logs, rigs, trajectories, messages, risks, tubulars] = await Promise.all([getLogs, getRigs, getTrajectories, getMessages, getRisks, getTubulars]);
      const selectWellbore: SelectWellboreAction = { type: NavigationType.SelectWellbore, payload: { well, wellbore, logs, rigs, trajectories, messages, risks, tubulars } };
      dispatchNavigation(selectWellbore);
      setIsFetchingData(false);
    }

    getChildren().catch(truncateAbortHandler);

    return () => {
      controller.abort();
    };
  }, [isFetchingData]);

  const onSelectLogGroup = async (well: Well, wellbore: Wellbore, logGroup: string) => {
    dispatchNavigation({ type: NavigationType.SelectLogGroup, payload: { well, wellbore, logGroup } });
  };

  const onSelectMessageGroup = async (well: Well, wellbore: Wellbore, messageGroup: string) => {
    dispatchNavigation({ type: NavigationType.SelectMessageGroup, payload: { well, wellbore, messageGroup } });
  };
  const onSelectRiskGroup = async (well: Well, wellbore: Wellbore, riskGroup: string) => {
    dispatchNavigation({ type: NavigationType.SelectMessageGroup, payload: { well, wellbore, riskGroup } });
  };

  const onSelectRigGroup = async (well: Well, wellbore: Wellbore, rigGroup: string) => {
    dispatchNavigation({ type: NavigationType.SelectRigGroup, payload: { well, wellbore, rigGroup } });
  };

  const onSelectTrajectoryGroup = async (well: Well, wellbore: Wellbore, trajectoryGroup: string) => {
    dispatchNavigation({ type: NavigationType.SelectTrajectoryGroup, payload: { well, wellbore, trajectoryGroup } });
  };

  const onSelectTubularGroup = async (well: Well, wellbore: Wellbore, tubularGroup: string) => {
    dispatchNavigation({ type: NavigationType.SelectTubularGroup, payload: { well, wellbore, tubularGroup } });
  };

  const onLabelClick = () => {
    const wellboreHasData = wellbore.logs?.length > 0;
    if (wellboreHasData) {
      const payload = {
        well,
        wellbore,
        logs: wellbore.logs,
        rigs: wellbore.rigs,
        trajectories: wellbore.trajectories,
        messages: wellbore.messages,
        risks: wellbore.risks,
        tubulars: wellbore.tubulars
      };
      const selectWellbore: SelectWellboreAction = { type: NavigationType.SelectWellbore, payload };
      dispatchNavigation(selectWellbore);
    } else {
      setIsFetchingData(true);
    }
  };

  const onIconClick = () => {
    const wellboreHasData = wellbore.logs?.length > 0;
    if (wellboreHasData) {
      const toggleTreeNode: ToggleTreeNodeAction = { type: NavigationType.ToggleTreeNode, payload: { nodeId: props.nodeId } };
      dispatchNavigation(toggleTreeNode);
    } else {
      setIsFetchingData(true);
    }
  };

  const logGroupId = calculateLogGroupId(wellbore);
  const messageGroupId = calculateMessageGroupId(wellbore);
  const riskGroupId = calculateRiskGroupId(wellbore);
  const trajectoryGroupId = calculateTrajectoryGroupId(wellbore);
  const rigGroupId = calculateRigGroupId(wellbore);
  const tubularGroupId = calculateTubularGroupId(wellbore);

  return (
    <TreeItem
      onContextMenu={(event) => onContextMenu(event, wellbore)}
      key={nodeId}
      nodeId={nodeId}
      selected={selected}
      labelText={wellbore.name}
      onLabelClick={onLabelClick}
      onIconClick={onIconClick}
      isActive={wellbore.isActive}
      isLoading={isFetchingData}
    >
      <TreeItem
        nodeId={logGroupId}
        labelText={"Logs"}
        onLabelClick={() => onSelectLogGroup(well, wellbore, logGroupId)}
        onContextMenu={(event) => onLogsContextMenu(event, wellbore)}
        isActive={wellbore.logs && wellbore.logs.some((log) => log.objectGrowing)}
      >
        <LogTypeItem well={well} wellbore={wellbore} />
      </TreeItem>

      <TreeItem
        nodeId={messageGroupId}
        labelText={"Messages"}
        onLabelClick={() => onSelectMessageGroup(well, wellbore, messageGroupId)}
        onContextMenu={preventContextMenuPropagation}
      />
      <TreeItem nodeId={riskGroupId} labelText={"Risks"} onLabelClick={() => onSelectRiskGroup(well, wellbore, riskGroupId)} onContextMenu={preventContextMenuPropagation} />
      <TreeItem nodeId={rigGroupId} labelText={"Rigs"} onLabelClick={() => onSelectRigGroup(well, wellbore, rigGroupId)} onContextMenu={preventContextMenuPropagation} />
      <TreeItem
        nodeId={trajectoryGroupId}
        labelText={"Trajectories"}
        onLabelClick={() => onSelectTrajectoryGroup(well, wellbore, trajectoryGroupId)}
        onContextMenu={preventContextMenuPropagation}
      >
        {wellbore &&
          wellbore.trajectories &&
          wellbore.trajectories.map((trajectory) => (
            <TrajectoryItem
              key={calculateTrajectoryId(trajectory)}
              trajectoryGroup={trajectoryGroupId}
              trajectory={trajectory}
              well={well}
              wellbore={wellbore}
              nodeId={calculateTrajectoryId(trajectory)}
              selected={selectedTrajectory && selectedTrajectory.uid === trajectory.uid ? true : undefined}
            />
          ))}
      </TreeItem>
      <TreeItem
        nodeId={tubularGroupId}
        labelText={"Tubulars"}
        onLabelClick={() => onSelectTubularGroup(well, wellbore, tubularGroupId)}
        onContextMenu={(event) => onTubularsContextMenu(event, wellbore)}
      >
        {wellbore &&
          wellbore.tubulars &&
          wellbore.tubulars.map((tubular) => (
            <TubularItem
              key={calculateTubularId(tubular)}
              tubularGroup={tubularGroupId}
              tubular={tubular}
              well={well}
              wellbore={wellbore}
              nodeId={calculateTubularId(tubular)}
              selected={selectedTubular && selectedTubular.uid === tubular.uid ? true : undefined}
            />
          ))}
      </TreeItem>
    </TreeItem>
  );
};

export default WellboreItem;
